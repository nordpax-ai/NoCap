import Link from "next/link";
import { pool } from "@/lib/db";
import { formatWhen } from "@/lib/time";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    firm_and_city: string;
    email: string;
    created_at: Date;
  }>(`SELECT id, name, firm_and_city, email, created_at FROM applications ORDER BY created_at DESC`);
  return (
    <>
      <h1 className="page-title">Applications</h1>
      <p className="help">Applications are emailed to the Founding Committee and kept here for members to read.</p>
      {rows.length === 0 ? <p className="muted">No applications yet.</p> : null}
      <div className="docs">
        {rows.map((row) => (
          <Link className="doc" key={row.id} href={`/area/applications/${row.id}`}>
            <span className="doc-name">{row.name}</span>
            <span className="doc-meta">{row.firm_and_city} · {formatWhen(row.created_at, false)}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
