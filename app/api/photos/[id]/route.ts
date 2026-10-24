import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { storageGet } from "@/lib/storage";

const PRIVATE_CACHE = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sign in required.", { status: 401, headers: PRIVATE_CACHE });
  }
  const { id } = await params;
  const { rows } = await pool.query<{ photo_key: string | null }>(
    `SELECT photo_key FROM profiles WHERE id = $1 AND status = 'active' AND photo_key IS NOT NULL`,
    [id],
  );
  const key = rows[0]?.photo_key;
  if (!key) return new Response("Not found", { status: 404, headers: PRIVATE_CACHE });
  const body = await storageGet(key);
  const mime = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": mime, ...PRIVATE_CACHE },
  });
}
