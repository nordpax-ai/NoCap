import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AssignmentForm } from "@/components/assignment-form";
import { SubmitButton } from "@/components/submit-button";
import { reviewArticle } from "@/lib/article-actions";
import { STATUS_LABEL, WORDS_MAX, WORDS_MIN, commentsFor, formatDay, getAssignment } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatWhen } from "@/lib/time";

export const metadata = { title: "Article" };

export default async function AdminArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; created?: string; reviewed?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, saved, created, reviewed } = await searchParams;
  const a = await getAssignment(id);
  if (!a) notFound();
  const comments = await commentsFor(a.id);
  const { rows: members } = await pool.query<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM profiles WHERE status = 'active' ORDER BY display_name`,
  );
  return (
    <>
      <p className="help"><Link href="/area/admin/articles">← All articles</Link></p>
      <h1 className="page-title">{a.member_name} · Month {a.plan_month}</h1>
      {created ? <p className="banner">Assignment created.</p> : null}
      {saved ? <p className="banner">Assignment saved.</p> : null}
      {reviewed ? <p className="banner">Review saved.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <p>
        <strong>Status:</strong> {STATUS_LABEL[a.status]}
        {" · "}<strong>Due:</strong> {formatDay(a.due_date)}
        {" · "}<strong>Publication:</strong> {formatDay(a.publication_date)}
        {a.submitted_at ? <> · <strong>Submitted:</strong> {formatWhen(a.submitted_at)}</> : null}
        {a.approved_at ? <> · <strong>Approved:</strong> {formatWhen(a.approved_at)}</> : null}
      </p>
      <section style={{ marginTop: 24 }}>
        <h2 className="page-title" style={{ fontSize: "1.3em" }}>{a.title || "No title yet"}</h2>
        <p className="help">{a.word_count} words · target {WORDS_MIN}–{WORDS_MAX}</p>
        <div className="thread" style={{ whiteSpace: "pre-wrap" }}>{a.body || "Nothing written yet."}</div>
      </section>
      <section style={{ marginTop: 24 }}>
        <h2 className="page-title" style={{ fontSize: "1.2em" }}>Comments</h2>
        {comments.length === 0 ? <p className="muted">No comments yet.</p> : null}
        {comments.map((c) => (
          <article className="thread" key={c.id}>
            <p className="by">{c.author_name || "Admin"} · {formatWhen(c.created_at)}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{c.body}</p>
          </article>
        ))}
        {a.status !== "approved" ? (
          <ActionForm action={reviewArticle} className="stack">
            <input type="hidden" name="assignment_id" value={a.id} />
            <input type="hidden" name="decision" value="comment" />
            <div>
              <label className="lbl" htmlFor="comment">Comment to the author (requests changes)</label>
              <textarea id="comment" name="comment" rows={5} required />
            </div>
            <SubmitButton className="btn">Send comment and request changes</SubmitButton>
          </ActionForm>
        ) : null}
        {a.status === "submitted" ? (
          <ActionForm action={reviewArticle} style={{ marginTop: 16 }}>
            <input type="hidden" name="assignment_id" value={a.id} />
            <input type="hidden" name="decision" value="approve" />
            <SubmitButton className="btn solid">Approve</SubmitButton>
          </ActionForm>
        ) : null}
      </section>
      <section style={{ marginTop: 36 }}>
        <h2 className="page-title" style={{ fontSize: "1.2em" }}>Edit the brief</h2>
        <AssignmentForm members={members} assignment={a} />
      </section>
    </>
  );
}
