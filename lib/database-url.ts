import type { PoolConfig } from "pg";

export type DatabaseUrlSource = "DATABASE_URL" | "DATABASE_URL_OWNER" | "DATABASE_URL_POOL";

export type ResolvedDatabaseUrl = {
  url: string;
  source: DatabaseUrlSource;
};

function postgresUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://")) return trimmed;
  return undefined;
}

const MISSING =
  "No Postgres connection string is available. Set DATABASE_URL to a postgres:// or postgresql:// URL, such as the Supabase session pooler URI. Values that do not start with those schemes, including file:./preview.db, are ignored.";

export function resolveDatabaseUrl(): ResolvedDatabaseUrl {
  const database = postgresUrl(process.env.DATABASE_URL);
  if (database) return { url: database, source: "DATABASE_URL" };
  throw new Error(MISSING);
}

export function resolveOwnerDatabaseUrl(): ResolvedDatabaseUrl {
  const owner = postgresUrl(process.env.DATABASE_URL_OWNER);
  if (owner) return { url: owner, source: "DATABASE_URL_OWNER" };
  return resolveDatabaseUrl();
}

// Runtime only. db:deploy keeps using resolveOwnerDatabaseUrl() so advisory locks
// stay on a session connection (port 5432) even when the app uses port 6543.
export function resolveRuntimeDatabaseUrl(): ResolvedDatabaseUrl {
  const pooled = postgresUrl(process.env.DATABASE_URL_POOL);
  if (pooled) return { url: pooled, source: "DATABASE_URL_POOL" };
  return resolveDatabaseUrl();
}

export function databaseTarget(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.hostname}${port}${parsed.pathname}`;
  } catch {
    return "postgres";
  }
}

function hostAndPort(connectionString: string): { host: string; port: string | undefined } {
  const rest = connectionString.replace(/^postgres(?:ql)?:\/\//i, "");
  const at = rest.lastIndexOf("@");
  const hostport = (at === -1 ? rest : rest.slice(at + 1)).split("/")[0].split("?")[0];
  if (hostport.startsWith("[")) {
    const end = hostport.indexOf("]");
    const host = end === -1 ? hostport : hostport.slice(1, end);
    const after = end === -1 ? "" : hostport.slice(end + 1);
    return { host, port: after.startsWith(":") ? after.slice(1) : undefined };
  }
  const colon = hostport.lastIndexOf(":");
  if (colon === -1) return { host: hostport, port: undefined };
  return { host: hostport.slice(0, colon), port: hostport.slice(colon + 1) };
}

function connectionHost(connectionString: string): string {
  return hostAndPort(connectionString).host;
}

export function isTransactionPooler(connectionString: string): boolean {
  const { port } = hostAndPort(connectionString);
  if (port === "6543") return true;
  const query = connectionString.split("?")[1];
  if (!query) return false;
  const params = new URLSearchParams(query);
  return params.get("pool_mode") === "transaction" || params.get("pgbouncer") === "true";
}

function sslMode(connectionString: string): string | undefined {
  const query = connectionString.split("?")[1];
  if (!query) return undefined;
  return new URLSearchParams(query).get("sslmode")?.toLowerCase();
}

function isSupabaseHost(host: string): boolean {
  return host.endsWith(".supabase.com") || host.endsWith(".supabase.co");
}

function setQueryParam(connectionString: string, name: string, value: string): string {
  const qIndex = connectionString.indexOf("?");
  const base = qIndex === -1 ? connectionString : connectionString.slice(0, qIndex);
  const params = new URLSearchParams(qIndex === -1 ? "" : connectionString.slice(qIndex + 1));
  params.set(name, value);
  return `${base}?${params.toString()}`;
}

export function pgPoolConfig(connectionString: string, max: number): PoolConfig {
  const host = connectionHost(connectionString);
  const mode = sslMode(connectionString);
  const supabase = isSupabaseHost(host);
  const transaction = isTransactionPooler(connectionString);
  const config: PoolConfig = {
    connectionString,
    max,
    // Keep the socket across warm invocations, then release it. Transaction
    // mode does not hold a Postgres backend while idle, so it can wait longer.
    idleTimeoutMillis: transaction ? 60_000 : 20_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };

  // Supabase's pooler requires TLS. pg 8 treats sslmode=require as certificate
  // verification, and the pooler certificate fails that check. sslmode=no-verify
  // still requires TLS and sets rejectUnauthorized: false.
  if (supabase && mode !== "verify-full" && mode !== "verify-ca") {
    config.connectionString = setQueryParam(connectionString, "sslmode", "no-verify");
  }
  return config;
}

export function runtimePoolMax(connectionString?: string): number {
  if (process.env.NETLIFY !== "true") return 10;
  // Session mode (5432) pins one backend per client. Stay at 1 so a warm
  // function cannot exhaust Supabase's session-pooler client limit.
  // Transaction mode (6543) shares backends, so a few parallel queries are safe.
  if (connectionString && isTransactionPooler(connectionString)) return 3;
  return 1;
}
