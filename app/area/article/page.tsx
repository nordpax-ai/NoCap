import { ActionForm } from "@/components/action-form";
import { ArticleEditor } from "@/components/article-editor";
import { SubmitButton } from "@/components/submit-button";
import { saveArticle } from "@/lib/article-actions";
import { STATUS_LABEL, WORDS_MAX, WORDS_MIN, assignmentsForMember, commentsFor, formatDay, memberCanEdit } from "@/lib/articles";
import { requireUser } from "@/lib/auth";
import { formatWhen } from "@/lib/time";
import { notFound } from "next/navigation";

export const metadata = { title: "Your article" };

export default async function ArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; submitted?: string }>;
}) {
  const user = await requireUser();
  const { error, saved, submitted } = await searchParams;
  const assignments = await assignmentsForMember(user.id);
  const assignment = assignments.find((a) => a.status !== "approved") ?? assignments[assignments.length - 1];
  if (!assignment) notFound();
  const comments = await commentsFor(assignment.id);
  const editable = memberCanEdit(assignment.status);
  return (
    <>
      <h1 className="page-title">Your article</h1>
      {saved ? <p className="banner">Draft saved.</p> : null}
      {submitted ? <p className="banner">Submitted. The co-chairs will review it and reply here.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <section className="stack" style={{ marginBottom: 28 }}>
        <div className="eyebrow">Brief · Slot A, member voice · Month {assignment.plan_month}</div>
        <h2 className="page-title" style={{ fontSize: "1.4em" }}>{assignment.theme}</h2>
        <p>
          <strong>Status:</strong> {STATUS_LABEL[assignment.status]}
          {" · "}<strong>Text due:</strong> {formatDay(assignment.due_date)}
          {" · "}<strong>Publication:</strong> {formatDay(assignment.publication_date)} (fixed)
        </p>
        <p className="help">
          {WORDS_MIN}–{WORDS_MAX} words, written in the first person and published under your name.
          {assignment.format_notes ? ` ${assignment.format_notes}` : ""}
        </p>
        {assignment.guidance ? (
          <div>
            <div className="lbl">Suggested structure</div>
            <p style={{ whiteSpace: "pre-wrap" }}>{assignment.guidance}</p>
          </div>
        ) : null}
      </section>
      {comments.length ? (
        <section style={{ marginBottom: 28 }}>
          <h2 className="page-title" style={{ fontSize: "1.2em" }}>Comments from the reviewers</h2>
          {comments.map((c) => (
            <article className="thread" key={c.id}>
              <p className="by">{c.author_name || "Admin"} · {formatWhen(c.created_at)}</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{c.body}</p>
            </article>
          ))}
        </section>
      ) : null}
      {!editable ? (
        <p className="note">
          {assignment.status === "approved"
            ? "Approved. The text below is final."
            : "Submitted for review. You can edit again if the reviewers ask for changes."}
        </p>
      ) : null}
      <ActionForm action={saveArticle} className="stack">
        <input type="hidden" name="assignment_id" value={assignment.id} />
        <ArticleEditor title={assignment.title || ""} body={assignment.body || ""} min={WORDS_MIN} max={WORDS_MAX} readOnly={!editable} />
        {editable ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SubmitButton className="btn" name="intent" value="draft">Save draft</SubmitButton>
            <SubmitButton className="btn solid" name="intent" value="submit">Submit for review</SubmitButton>
          </div>
        ) : null}
      </ActionForm>
    </>
  );
}
