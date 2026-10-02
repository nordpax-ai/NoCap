import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { downloadResponse } from "@/lib/export";
import { storageGet } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const { rows } = await pool.query<{ storage_key: string; filename: string; mime_type: string }>(
    `SELECT storage_key, filename, mime_type FROM attachments WHERE id = $1`,
    [id],
  );
  const file = rows[0];
  if (!file) return new Response("Not found", { status: 404 });
  return downloadResponse(await storageGet(file.storage_key), file.filename, file.mime_type);
}
