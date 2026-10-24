import Link from "next/link";
import { AssignmentForm } from "@/components/assignment-form";
import { STATUS_LABEL, allAssignments, formatDay } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";
import { pool } from "@/lib/db";

export const metadata = { title: "Articles" };

export default async function AdminArticlesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const assignments = await allAssignments();
  const { rows: members } = await pool.query<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM profiles WHERE status = 'active' ORDER BY display_name`,
  );
  return (
    <>
      <h1 className="page-title">Articles</h1>
      <p className="help">
        Slot A (member voice) assignments. Members see a &quot;Your article&quot; page only when they have one. Nothing is posted to LinkedIn from here.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <table>
        <thead>
          <tr><th>Member</th><th>Theme</th><th>Status</th><th>Due</th><th>Publication</th><th></th></tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id}>
              <td>{a.member_name}</td>
              <td>M{a.plan_month} · {a.theme}</td>
              <td>{STATUS_LABEL[a.status]}</td>
              <td>{formatDay(a.due_date)}</td>
              <td>{formatDay(a.publication_date)}</td>
              <td><Link href={`/area/admin/articles/${a.id}`}>Open</Link></td>
            </tr>
          ))}
          {assignments.length === 0 ? (
            <tr><td colSpan={6} className="muted">No assignments yet.</td></tr>
          ) : null}
        </tbody>
      </table>
      <section style={{ marginTop: 36 }}>
        <h2 className="page-title" style={{ fontSize: "1.4em" }}>New assignment</h2>
        <AssignmentForm members={members} />
      </section>
    </>
  );
}
