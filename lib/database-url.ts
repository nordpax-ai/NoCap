import { getConnectionString } from "@netlify/database";

export type DatabaseUrlSource =
  | "@netlify/database"
  | "NETLIFY_DB_URL"
  | "NETLIFY_DATABASE_URL"
  | "DATABASE_URL_OWNER"
  | "DATABASE_URL";

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

function fromEnv(name: DatabaseUrlSource): string | undefined {
  if (name === "@netlify/database") return undefined;
  return postgresUrl(process.env[name]);
}

function netlifyProvidedUrl(): ResolvedDatabaseUrl | undefined {
  try {
    const url = postgresUrl(getConnectionString());
    if (url) return { url, source: "@netlify/database" };
  } catch {
    // Off Netlify, or the runtime has not injected NETLIFY_DB_URL.
    // getConnectionString() throws MissingDatabaseConnectionError in that case.
  }
  const injected = fromEnv("NETLIFY_DB_URL");
  if (injected) return { url: injected, source: "NETLIFY_DB_URL" };
  const legacy = fromEnv("NETLIFY_DATABASE_URL");
  if (legacy) return { url: legacy, source: "NETLIFY_DATABASE_URL" };
  return undefined;
}

const MISSING =
  "No Postgres connection string is available. Checked getConnectionString() from @netlify/database, then NETLIFY_DB_URL, NETLIFY_DATABASE_URL, and DATABASE_URL. A value is used only when it starts with postgres:// or postgresql://. Other values, including file:./preview.db, are ignored.";

export function resolveDatabaseUrl(): ResolvedDatabaseUrl {
  const netlify = netlifyProvidedUrl();
  if (netlify) return netlify;
  const database = fromEnv("DATABASE_URL");
  if (database) return { url: database, source: "DATABASE_URL" };
  throw new Error(MISSING);
}

export function resolveOwnerDatabaseUrl(): ResolvedDatabaseUrl {
  const netlify = netlifyProvidedUrl();
  if (netlify) return netlify;
  const owner = fromEnv("DATABASE_URL_OWNER");
  if (owner) return { url: owner, source: "DATABASE_URL_OWNER" };
  const database = fromEnv("DATABASE_URL");
  if (database) return { url: database, source: "DATABASE_URL" };
  throw new Error(
    `${MISSING} Migrations also accept DATABASE_URL_OWNER when it is a Postgres URL.`,
  );
}

export function databaseTarget(url: string): string {
  const parsed = new URL(url);
  const port = parsed.port ? `:${parsed.port}` : "";
  return `${parsed.hostname}${port}${parsed.pathname}`;
}
