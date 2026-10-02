import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { downloadResponse } from "@/lib/export";
import { storageGet } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const { rows } = await pool.query<{ cv_key: string | null; cv_filename: string | null }>(
    `SELECT cv_key, cv_filename FROM applications WHERE id = $1`,
    [id],
  );
  const application = rows[0];
  if (!application?.cv_key) return new Response("Not found", { status: 404 });
  return downloadResponse(await storageGet(application.cv_key), application.cv_filename || "cv.pdf", "application/pdf");
}
