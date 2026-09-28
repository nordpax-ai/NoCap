import { Pool, types, type PoolClient } from "pg";
import { env } from "./env";

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

const globalForPg = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForPg.pool ??
  new Pool({ connectionString: env.databaseUrl(), max: 10 });

if (process.env.NODE_ENV !== "production") globalForPg.pool = pool;

export async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
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
