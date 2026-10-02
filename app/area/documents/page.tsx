import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { DocIcon } from "@/components/members-shell";
import { SubmitButton } from "@/components/submit-button";
import { uploadRegister, uploadShared } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatShort } from "@/lib/time";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; area?: string }>;
}) {
  const user = await requireUser();
  const { q = "", error, area } = await searchParams;
  const query = q.trim();
  const { rows } = await pool.query<{
    documents: {
      id: string;
      area: string;
      category: string;
      title: string;
      immutable: boolean;
      version_number: number;
      uploaded_at: string;
    }[] | null;
    closed: { id: string; subject: string; closed_at: string; outcome: string }[] | null;
  }>(
    `SELECT
       COALESCE((
         SELECT json_agg(json_build_object(
                  'id', d.id, 'area', d.area, 'category', d.category, 'title', d.title,
                  'immutable', d.immutable, 'version_number', v.version_number, 'uploaded_at', v.uploaded_at
                ) ORDER BY d.area, d.category, d.title)
         FROM documents d
         JOIN document_versions v ON v.document_id = d.id
         WHERE ($1 = '' OR d.title ILIKE '%' || $1 || '%')
           AND v.version_number = (SELECT max(version_number) FROM document_versions WHERE document_id = d.id)
       ), '[]'::json) AS documents,
       COALESCE((
         SELECT json_agg(json_build_object(
                  'id', id, 'subject', subject, 'closed_at', closed_at, 'outcome', outcome
                ) ORDER BY closed_at DESC)
         FROM votes
         WHERE status = 'closed' AND ($1 = '' OR subject ILIKE '%' || $1 || '%')
       ), '[]'::json) AS closed`,
    [query],
  );
  const library = rows[0]?.documents ?? [];
  const register = library.filter((row) => row.area === "register");
  const shared = library.filter((row) => row.area === "shared");
  const closed = rows[0]?.closed ?? [];

  return (
    <>
      <h1 className="page-title">Documents</h1>
      <p className="help">The official register is uploaded by an admin. The shared folder is open to every member. Search is by title. Tick items to download them together.</p>
      {error ? <p className="error">{error}</p> : null}
      <ActionForm className="search" action="/area/documents" method="get">
        <input name="q" defaultValue={query} placeholder="Search by title" aria-label="Search by title" />
        <SubmitButton className="btn">Search</SubmitButton>
      </ActionForm>

      <ActionForm action="/api/documents/bulk" method="post">
        <div className="head"><div className="eyebrow">Official register</div></div>
        <div className="docs">
          {register.map((doc) => (
            <div className="doc" key={doc.id}>
              <label className="row-check">
                <input type="checkbox" name="ids" value={doc.id} aria-label={`Select ${doc.title}`} />
              </label>
              <DocIcon />
              <Link className="doc-name" href={`/area/documents/${doc.id}`}>{doc.title}</Link>
              <span className="doc-meta">{doc.category.replaceAll("_", " ")} · v{doc.version_number} · {formatShort(doc.uploaded_at)}</span>
            </div>
          ))}
          {closed.map((vote) => (
            <a className="doc" key={vote.id} href={`/api/votes/${vote.id}/record`}>
              <DocIcon />
              <span className="doc-name">{vote.subject}</span>
              <span className="doc-meta">vote record · {formatShort(vote.closed_at)}</span>
            </a>
          ))}
        </div>

        <div className="head"><div className="eyebrow">Shared folder</div></div>
        <div className="docs">
          {shared.map((doc) => (
            <div className="doc" key={doc.id}>
              <label className="row-check">
                <input type="checkbox" name="ids" value={doc.id} aria-label={`Select ${doc.title}`} />
              </label>
              <DocIcon />
              <Link className="doc-name" href={`/area/documents/${doc.id}`}>{doc.title}</Link>
              <span className="doc-meta">v{doc.version_number} · {formatShort(doc.uploaded_at)}</span>
            </div>
          ))}
          {shared.length === 0 ? <p className="muted">Nothing in the shared folder matches.</p> : null}
        </div>
        <SubmitButton className="btn">Download selected</SubmitButton>
      </ActionForm>

      <div className="head" style={{ marginTop: 36 }}><div className="eyebrow">Add to the shared folder</div></div>
      <ActionForm action={uploadShared} className="stack">
        <div>
          <label className="lbl" htmlFor="shared-title">Title</label>
          <input id="shared-title" name="title" required />
        </div>
        <div>
          <label className="lbl" htmlFor="shared-file">File</label>
          <input id="shared-file" name="file" type="file" required />
        </div>
        <SubmitButton className="btn solid">Upload</SubmitButton>
      </ActionForm>

      {user.role === "admin" ? (
        <>
          <div className="head" style={{ marginTop: 36 }}><div className="eyebrow">Add to the register</div></div>
          <ActionForm action={uploadRegister} className="stack">
            <div>
              <label className="lbl" htmlFor="category">Category</label>
              <select id="category" name="category" defaultValue="minutes">
                <option value="charter">Charter / statute</option>
                <option value="code_of_conduct">Code of conduct</option>
                <option value="minutes">Minutes</option>
                <option value="resolution">Resolution</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="lbl" htmlFor="reg-title">Title</label>
              <input id="reg-title" name="title" required />
            </div>
            <div>
              <label className="lbl" htmlFor="reg-file">File</label>
              <input id="reg-file" name="file" type="file" required />
            </div>
            <p className="help">A resolution cannot be edited or deleted after it is uploaded, including by an admin.</p>
            <SubmitButton className="btn solid">Upload to the register</SubmitButton>
          </ActionForm>
          {area === "shared" ? null : null}
        </>
      ) : null}

      <div className="head" id="export" style={{ marginTop: 36 }}>
        <div className="eyebrow">Export</div>
      </div>
      <p className="help">
        Download every document, in every version, and the resolutions register. The archive is a zip of files and a JSON copy of the votes. It does not depend on the host once you have it.
      </p>
      <a className="btn solid" href="/api/export">Download everything</a>
    </>
  );
}
