import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { downloadResponse } from "@/lib/export";
import { storageGet } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const { rows } = await pool.query<{ storage_key: string; filename: string; mime_type: string }>(
    `SELECT storage_key, filename, mime_type FROM document_versions WHERE id = $1`,
    [id],
  );
  const version = rows[0];
  if (!version) return new Response("Not found", { status: 404 });
  const body = await storageGet(version.storage_key);
  return downloadResponse(body, version.filename, version.mime_type);
}
