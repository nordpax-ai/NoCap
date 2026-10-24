import { createHash } from "crypto";
import type { PoolClient } from "pg";

const WINDOW = "60 seconds";

export function fingerprint(parts: readonly unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function fileMark(file: { filename: string; size: number; buffer: Buffer } | null): string {
  if (!file) return "";
  const hash = createHash("sha256").update(file.buffer).digest("hex");
  return `${file.filename}:${file.size}:${hash}`;
}

export function formToken(formData: FormData): string | null {
  const raw = String(formData.get("idempotency_key") || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(raw)) {
    return null;
  }
  return raw;
}

async function lockCreate(client: PoolClient, actorId: string, action: string, token: string | null, print: string) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
    `fp:${actorId}:${action}:${print}`,
  ]);
  if (token) {
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`tok:${token}`]);
  }
}

/** Returns an existing resource when this submit repeats the same form, or the same content inside 60 seconds. */
export async function existingCreate(
  client: PoolClient,
  actorId: string,
  action: string,
  token: string | null,
  print: string,
): Promise<string | null> {
  await lockCreate(client, actorId, action, token, print);
  if (token) {
    const byToken = await client.query<{ resource_id: string }>(
      `SELECT resource_id FROM create_guards WHERE token = $1`,
      [token],
    );
    if (byToken.rows[0]) return byToken.rows[0].resource_id;
  }
  const byPrint = await client.query<{ resource_id: string }>(
    `SELECT resource_id FROM create_guards
     WHERE actor_id = $1 AND action = $2 AND fingerprint = $3
       AND created_at > now() - $4::interval`,
    [actorId, action, print, WINDOW],
  );
  return byPrint.rows[0]?.resource_id ?? null;
}

export async function rememberCreate(
  client: PoolClient,
  actorId: string,
  action: string,
  token: string | null,
  print: string,
  resourceId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO create_guards (actor_id, action, fingerprint, token, resource_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (actor_id, action, fingerprint) DO UPDATE
       SET token = EXCLUDED.token,
           resource_id = EXCLUDED.resource_id,
           created_at = now()`,
    [actorId, action, print, token, resourceId],
  );
}
