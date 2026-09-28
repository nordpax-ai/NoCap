import type { PoolConfig } from "pg";

export type DatabaseUrlSource = "DATABASE_URL" | "DATABASE_URL_OWNER";

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

export function databaseTarget(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.hostname}${port}${parsed.pathname}`;
  } catch {
    return "postgres";
  }
}

function connectionHost(connectionString: string): string {
  const rest = connectionString.replace(/^postgres(?:ql)?:\/\//i, "");
  const at = rest.lastIndexOf("@");
  const hostport = (at === -1 ? rest : rest.slice(at + 1)).split("/")[0].split("?")[0];
  if (hostport.startsWith("[")) {
    const end = hostport.indexOf("]");
    return end === -1 ? hostport : hostport.slice(1, end);
  }
  return hostport.replace(/:\d+$/, "");
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
  const config: PoolConfig = {
    connectionString,
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
  };

  // Supabase's pooler requires TLS. pg 8 treats sslmode=require as certificate
  // verification, and the pooler certificate fails that check. sslmode=no-verify
  // still requires TLS and sets rejectUnauthorized: false.
  if (supabase && mode !== "verify-full" && mode !== "verify-ca") {
    config.connectionString = setQueryParam(connectionString, "sslmode", "no-verify");
  }
  return config;
}

export function runtimePoolMax(): number {
  return process.env.NETLIFY === "true" ? 1 : 10;
}
