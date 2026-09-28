import Link from "next/link";
import { notFound } from "next/navigation";
import { uploadRegister, uploadSharedVersion } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatWhen } from "@/lib/time";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { rows } = await pool.query<{
    id: string;
    title: string;
    area: string;
    category: string;
    immutable: boolean;
  }>(`SELECT id, title, area, category, immutable FROM documents WHERE id = $1`, [id]);
  const doc = rows[0];
  if (!doc) notFound();
  const { rows: versions } = await pool.query<{
    id: string;
    version_number: number;
    filename: string;
    byte_size: number;
    uploaded_at: Date;
    display_name: string;
  }>(
    `SELECT v.id, v.version_number, v.filename, v.byte_size, v.uploaded_at, p.display_name
     FROM document_versions v JOIN profiles p ON p.id = v.uploaded_by
     WHERE v.document_id = $1 ORDER BY v.version_number DESC`,
    [id],
  );
  return (
    <>
      <p className="eyebrow">{doc.area === "register" ? "Official register" : "Shared folder"}</p>
      <h1 className="page-title">{doc.title}</h1>
      <p className="help">{doc.category.replaceAll("_", " ")}{doc.immutable ? " · cannot be changed" : ""}</p>
      <div className="docs">
        {versions.map((version) => (
          <a className="doc" key={version.id} href={`/api/documents/versions/${version.id}`}>
            <span className="doc-name">Version {version.version_number} — {version.filename}</span>
            <span className="doc-meta">{version.display_name} · {formatWhen(version.uploaded_at)} · {Math.ceil(version.byte_size / 1024)} KB</span>
          </a>
        ))}
      </div>
      {!doc.immutable && doc.area === "register" && user.role === "admin" ? (
        <form action={uploadRegister} className="stack">
          <input type="hidden" name="document_id" value={doc.id} />
          <input type="hidden" name="title" value={doc.title} />
          <div>
            <label className="lbl" htmlFor="file">New version</label>
            <input id="file" name="file" type="file" required />
          </div>
          <button className="btn" type="submit">Upload new version</button>
        </form>
      ) : null}
      {!doc.immutable && doc.area === "shared" ? (
        <form action={uploadSharedVersion} className="stack">
          <input type="hidden" name="document_id" value={doc.id} />
          <div>
            <label className="lbl" htmlFor="shared-version">New version</label>
            <input id="shared-version" name="file" type="file" required />
          </div>
          <button className="btn" type="submit">Upload new version</button>
        </form>
      ) : null}
      <p style={{ marginTop: 18 }}><Link href="/area/documents">Back to documents</Link></p>
    </>
  );
}
