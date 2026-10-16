import { createHmac } from "crypto";
import { headers } from "next/headers";
import { pool } from "./db";

export const REGISTER_URL = "https://nocap-law.com/register";

export function normaliseCode(code: string): string {
  return code.trim().toLowerCase();
}

export function codeHash(code: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`register:${normaliseCode(code)}`).digest("hex");
}

export async function clientHash(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-nf-client-connection-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return codeHash(`client:${ip}`);
}

export type RegistrationState = { open: boolean; hasCode: boolean; updatedAt: string | null };

export async function registrationState(): Promise<RegistrationState> {
  const { rows } = await pool.query<{ registration_open: boolean; has_code: boolean; updated_at: string }>(
    `SELECT registration_open, code_hash IS NOT NULL AS has_code, updated_at FROM registration_settings WHERE id`,
  );
  const row = rows[0];
  return { open: !!row?.registration_open, hasCode: !!row?.has_code, updatedAt: row?.updated_at ?? null };
}

// Ten failed tries per client in 15 minutes, and 60 tries of any kind overall.
export async function tooManyAttempts(client: string): Promise<boolean> {
  const { rows } = await pool.query<{ mine: number; total: number }>(
    `SELECT
       count(*) FILTER (WHERE client_hash = $1 AND NOT succeeded)::int AS mine,
       count(*)::int AS total
     FROM registration_attempts
     WHERE created_at > now() - interval '15 minutes'`,
    [client],
  );
  return rows[0].mine >= 10 || rows[0].total >= 60;
}

export async function recordAttempt(client: string, succeeded: boolean): Promise<void> {
  await pool.query(`INSERT INTO registration_attempts (client_hash, succeeded) VALUES ($1, $2)`, [client, succeeded]);
  await pool.query(`DELETE FROM registration_attempts WHERE created_at < now() - interval '1 day'`);
}
