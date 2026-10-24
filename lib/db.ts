import { Pool, types, type PoolClient } from "pg";
import { databaseTarget, pgPoolConfig, resolveRuntimeDatabaseUrl, runtimePoolMax } from "./database-url";

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

const globalForPg = globalThis as unknown as { pool?: Pool };
const resolved = resolveRuntimeDatabaseUrl();

function createPool(): Pool {
  const created = new Pool(pgPoolConfig(resolved.url, runtimePoolMax(resolved.url)));
  // An idle client that the pooler drops emits "error". With no listener,
  // Node treats that as an unhandled error and the function crashes.
  created.on("error", (error) => {
    console.error("[db] idle connection dropped", {
      target: databaseTarget(resolved.url),
      source: resolved.source,
      message: error.message.split("\n")[0],
    });
  });
  const original = created.query.bind(created) as (...args: unknown[]) => Promise<unknown>;
  created.query = ((...args: unknown[]) => queryWithRetry(() => original(...args))) as Pool["query"];
  return created;
}

export const pool = globalForPg.pool ?? createPool();
globalForPg.pool = pool;

let queryCount = 0;

export function takeQueryCount(): number {
  const count = queryCount;
  queryCount = 0;
  return count;
}

function latencyMs(): number {
  const value = Number(process.env.DB_LATENCY_MS || "0");
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientDbError(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|EAI_AGAIN|ENOTFOUND|57P01|53300|08000|08001|08003|08004|08006|Connection terminated|too many clients|MaxClients|remaining connection slots|timeout exceeded when trying to connect|Client has encountered a connection error|sorry, too many clients|server conn crashed|db_termination|Connection refused/i.test(
    `${code} ${message}`,
  );
}

async function queryWithRetry<T>(run: () => Promise<T>): Promise<T> {
  queryCount += 1;
  const wait = latencyMs();
  if (wait) await delay(wait);
  try {
    return await run();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    console.error("[db] transient connection error, retrying once", {
      target: databaseTarget(resolved.url),
      source: resolved.source,
      message: error instanceof Error ? error.message.split("\n")[0] : String(error),
    });
    queryCount += 1;
    if (wait) await delay(wait);
    return run();
  }
}

export async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  try {
    return await runTx(fn);
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    console.error("[db] transient transaction error, retrying once", {
      target: databaseTarget(resolved.url),
      source: resolved.source,
      message: error instanceof Error ? error.message.split("\n")[0] : String(error),
    });
    return runTx(fn);
  }
}

async function runTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("[db] rollback failed", rollbackError instanceof Error ? rollbackError.message.split("\n")[0] : rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const line = error.message.split("\n")[0].replace(/^error:\s*/i, "");
    if (/duplicate key/i.test(line) && /email/i.test(line)) {
      return "That email is already on the list.";
    }
    if (/duplicate key/i.test(line) && /slug/i.test(line)) {
      return "A publication with that title already exists.";
    }
    return line;
  }
  return "Something went wrong.";
}
