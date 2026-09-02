import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };
const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  status: string;
  slug: string;
  firm: string | null;
  city: string | null;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE") return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role === "ADMIN" ? "ADMIN" : "MEMBER",
      status: user.status,
      slug: user.slug,
      firm: user.firm,
      city: user.city,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/app");
  return user;
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
