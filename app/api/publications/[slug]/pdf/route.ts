import { pool } from "@/lib/db";
import { downloadResponse } from "@/lib/export";
import { storageGet } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { rows } = await pool.query<{ pdf_key: string | null; title: string }>(
    `SELECT pdf_key, title FROM publications WHERE slug = $1`,
    [slug],
  );
  const publication = rows[0];
  if (!publication?.pdf_key) return new Response("Not found", { status: 404 });
  return downloadResponse(await storageGet(publication.pdf_key), `${slug}.pdf`, "application/pdf");
}
