import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { DeleteControl } from "@/components/delete-control";
import { SubmitButton } from "@/components/submit-button";
import { deleteQuestion, remindQuestion, replyToQuestion } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatWhen, questionStatus } from "@/lib/time";

export default async function QuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; reminded?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error, reminded } = await searchParams;
  const { rows } = await pool.query<{
    id: string;
    title: string;
    body: string;
    deadline: string | null;
    created_at: string;
    author_id: string;
    author: string;
    comments: { id: string; body: string; created_at: string; author: string; author_id: string }[] | null;
    files: { id: string; filename: string; parent_id: string; parent_type: string }[] | null;
  }>(
    `SELECT q.id, q.title, q.body, q.deadline, q.created_at, q.author_id, p.display_name AS author,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'id', c.id, 'body', c.body, 'created_at', c.created_at,
                       'author_id', c.author_id, 'author', cp.display_name
                     ) ORDER BY c.created_at)
              FROM question_comments c
              JOIN profiles cp ON cp.id = c.author_id
              WHERE c.question_id = q.id
            ), '[]'::json) AS comments,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'id', a.id, 'filename', a.filename,
                       'parent_id', a.parent_id, 'parent_type', a.parent_type
                     ))
              FROM attachments a
              WHERE (a.parent_type = 'question' AND a.parent_id = q.id)
                 OR (a.parent_type = 'comment' AND a.parent_id IN (
                      SELECT id FROM question_comments WHERE question_id = q.id
                    ))
            ), '[]'::json) AS files
     FROM questions q
     JOIN profiles p ON p.id = q.author_id
     WHERE q.id = $1`,
    [id],
  );
  const question = rows[0];
  if (!question) notFound();
  const comments = question.comments ?? [];
  const files = question.files ?? [];
  const status = questionStatus(question.deadline);
  return (
    <>
      <article className="thread">
        <div className="tags">
          <span className="tag">Question</span>
          <span className="dot" />
          <span className={status.open ? "tag now" : "tag"}>{status.text}</span>
        </div>
        <h1 className="title">{question.title}</h1>
        <div className="by">{question.author} · {formatWhen(question.created_at)}</div>
        {question.deadline ? <div className="by">Deadline {formatWhen(question.deadline)}</div> : null}
        <p className="body">{question.body}</p>
        <FileLinks files={files.filter((file) => file.parent_id === question.id)} />
        {question.author_id === user.id ? (
          <DeleteControl
            action={deleteQuestion}
            label="Delete this question"
            confirm="Delete this question? This cannot be undone."
            hidden={{ question_id: question.id }}
            buttonId="delete-question"
          />
        ) : null}
      </article>
      {reminded ? <p className="banner">Reminder sent.</p> : null}
      {question.author_id === user.id ? (
        <ActionForm action={remindQuestion}>
          <input type="hidden" name="question_id" value={question.id} />
          <SubmitButton className="nudge">Send a reminder</SubmitButton>
        </ActionForm>
      ) : null}
      <div className="head" style={{ marginTop: 28 }}><div className="eyebrow">Replies</div></div>
      {comments.map((comment) => (
        <div className="comment" key={comment.id}>
          <div className="by">{comment.author} · {formatWhen(comment.created_at)}</div>
          <p className="body">{comment.body}</p>
          <FileLinks files={files.filter((file) => file.parent_id === comment.id)} />
        </div>
      ))}
      {error ? <p className="error">{error}</p> : null}
      <ActionForm action={replyToQuestion} className="stack" style={{ marginTop: 18 }}>
        <input type="hidden" name="question_id" value={question.id} />
        <div>
          <label className="lbl" htmlFor="body">Reply</label>
          <textarea id="body" name="body" required />
        </div>
        <div>
          <label className="lbl" htmlFor="attachments">Attachment</label>
          <input id="attachments" name="attachments" type="file" multiple />
        </div>
        <SubmitButton className="btn solid">Reply</SubmitButton>
      </ActionForm>
      <p style={{ marginTop: 18 }}><Link href="/area/questions">All questions</Link></p>
    </>
  );
}

function FileLinks({ files }: { files: { id: string; filename: string }[] }) {
  if (!files.length) return null;
  return (
    <p className="by">
      {files.map((file) => (
        <a key={file.id} href={`/api/attachments/${file.id}`}>{file.filename}</a>
      ))}
    </p>
  );
}
