import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pool } from "./db";
import { env } from "./env";

export type Member = {
  id: string;
  email: string;
  role: "admin" | "member";
  status: "invited" | "active" | "deactivated";
  display_name: string;
  firm: string | null;
  city: string | null;
  practice_area: string | null;
  contacts: string | null;
  public_role: string | null;
  bio: string | null;
  jurisdiction: string | null;
  photo_key: string | null;
  is_example: boolean;
};

const COOKIE = "nocap_session";

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: tokenHash(token) };
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  return null;
}

export async function getCurrentUser(): Promise<Member | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const { rows } = await pool.query<Member>(
    `SELECT p.id, p.email, p.role, p.status, p.display_name, p.firm, p.city,
            p.practice_area, p.contacts, p.public_role, p.bio, p.jurisdiction,
            p.photo_key, p.is_example
     FROM sessions s
     JOIN profiles p ON p.id = s.profile_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND p.status = 'active'`,
    [tokenHash(token)],
  );
  return rows[0] ?? null;
}

export async function requireUser(): Promise<Member> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<Member> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/area");
  return user;
}

export async function startSession(profileId: string): Promise<void> {
  const { token, hash } = newToken();
  const days = env.sessionDays();
  await pool.query(
    `INSERT INTO sessions (profile_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [profileId, hash, String(days)],
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash(token)]);
  }
  jar.delete(COOKIE);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
