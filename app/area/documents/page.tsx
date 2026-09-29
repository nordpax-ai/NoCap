import Link from "next/link";
import { DocIcon } from "@/components/members-shell";
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
    id: string;
    area: string;
    category: string;
    title: string;
    immutable: boolean;
    version_number: number;
    uploaded_at: Date;
  }>(
    `SELECT d.id, d.area, d.category, d.title, d.immutable, v.version_number, v.uploaded_at
     FROM documents d
     JOIN document_versions v ON v.document_id = d.id
     WHERE ($1 = '' OR d.title ILIKE '%' || $1 || '%')
       AND v.version_number = (SELECT max(version_number) FROM document_versions WHERE document_id = d.id)
     ORDER BY d.area, d.category, d.title`,
    [query],
  );
  const register = rows.filter((row) => row.area === "register");
  const shared = rows.filter((row) => row.area === "shared");
  const { rows: closed } = await pool.query<{ id: string; subject: string; closed_at: Date; outcome: string }>(
    `SELECT id, subject, closed_at, outcome FROM votes
     WHERE status = 'closed' AND ($1 = '' OR subject ILIKE '%' || $1 || '%')
     ORDER BY closed_at DESC`,
    [query],
  );

  return (
    <>
      <h1 className="page-title">Documents</h1>
      <p className="help">The official register is uploaded by an admin. The shared folder is open to every member. Search is by title. Tick items to download them together.</p>
      {error ? <p className="error">{error}</p> : null}
      <form className="search" action="/area/documents">
        <input name="q" defaultValue={query} placeholder="Search by title" aria-label="Search by title" />
        <button className="btn" type="submit">Search</button>
      </form>

      <form action="/api/documents/bulk" method="post">
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
        <button className="btn" type="submit">Download selected</button>
      </form>

      <div className="head" style={{ marginTop: 36 }}><div className="eyebrow">Add to the shared folder</div></div>
      <form action={uploadShared} className="stack">
        <div>
          <label className="lbl" htmlFor="shared-title">Title</label>
          <input id="shared-title" name="title" required />
        </div>
        <div>
          <label className="lbl" htmlFor="shared-file">File</label>
          <input id="shared-file" name="file" type="file" required />
        </div>
        <button className="btn solid" type="submit">Upload</button>
      </form>

      {user.role === "admin" ? (
        <>
          <div className="head" style={{ marginTop: 36 }}><div className="eyebrow">Add to the register</div></div>
          <form action={uploadRegister} className="stack">
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
            <button className="btn solid" type="submit">Upload to the register</button>
          </form>
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
