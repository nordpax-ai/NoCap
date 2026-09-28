import { pool } from "@/lib/db";
import { storageGet } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await pool.query<{ photo_key: string | null }>(
    `SELECT photo_key FROM profiles WHERE id = $1 AND status = 'active' AND photo_key IS NOT NULL`,
    [id],
  );
  const key = rows[0]?.photo_key;
  if (!key) return new Response("Not found", { status: 404 });
  const body = await storageGet(key);
  const mime = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" },
  });
}
