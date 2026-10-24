import { createHmac, timingSafeEqual } from "crypto";

function sign(profileId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`unsubscribe:${profileId}`).digest("base64url");
}

export function unsubscribeToken(profileId: string): string {
  return `${Buffer.from(profileId).toString("base64url")}.${sign(profileId)}`;
}

// Returns the profile id when the token is genuine, otherwise null.
export function readUnsubscribeToken(token: string): string | null {
  const [idPart, mac] = token.split(".");
  if (!idPart || !mac) return null;
  const profileId = Buffer.from(idPart, "base64url").toString();
  const expected = Buffer.from(sign(profileId));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return profileId;
}
