import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { createPublication } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { pool } from "@/lib/db";

export const metadata = { title: "New publication" };

export default async function NewPublicationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const { rows } = await pool.query<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM profiles WHERE status = 'active' ORDER BY display_name`,
  );
  return (
    <>
      <h1 className="page-title">New publication</h1>
      <p className="help">Publications are opened on the chair&apos;s indication. The public page shows the category, author and date. A detail page and an optional PDF are the current format, which is still an open decision.</p>
      {error ? <p className="error">{error}</p> : null}
      <ActionForm action={createPublication} className="stack">
        <div>
          <label className="lbl" htmlFor="title">Title</label>
          <input id="title" name="title" required />
        </div>
        <div>
          <label className="lbl" htmlFor="category">Category</label>
          <input id="category" name="category" required placeholder="Deal terms" />
        </div>
        <div>
          <label className="lbl" htmlFor="author_id">Author</label>
          <select id="author_id" name="author_id">
            <option value="">—</option>
            {rows.map((member) => (
              <option key={member.id} value={member.id}>{member.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl" htmlFor="published_on">Date</label>
          <input id="published_on" name="published_on" type="date" required />
        </div>
        <div>
          <label className="lbl" htmlFor="summary">Summary</label>
          <textarea id="summary" name="summary" required />
        </div>
        <div>
          <label className="lbl" htmlFor="body">Text</label>
          <textarea id="body" name="body" required />
        </div>
        <div>
          <label className="lbl" htmlFor="pdf">PDF, optional</label>
          <input id="pdf" name="pdf" type="file" accept="application/pdf" />
        </div>
        <SubmitButton className="btn solid">Publish</SubmitButton>
      </ActionForm>
    </>
  );
}
