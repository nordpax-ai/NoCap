import Link from "next/link";
import { notFound } from "next/navigation";
import { remindQuestion, replyToQuestion } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatWhen } from "@/lib/time";

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
    deadline: Date | null;
    created_at: Date;
    author_id: string;
    author: string;
  }>(
    `SELECT q.id, q.title, q.body, q.deadline, q.created_at, q.author_id, p.display_name AS author
     FROM questions q JOIN profiles p ON p.id = q.author_id WHERE q.id = $1`,
    [id],
  );
  const question = rows[0];
  if (!question) notFound();
  const { rows: comments } = await pool.query<{
    id: string;
    body: string;
    created_at: Date;
    author: string;
    author_id: string;
  }>(
    `SELECT c.id, c.body, c.created_at, c.author_id, p.display_name AS author
     FROM question_comments c JOIN profiles p ON p.id = c.author_id
     WHERE c.question_id = $1 ORDER BY c.created_at`,
    [id],
  );
  const { rows: files } = await pool.query<{ id: string; filename: string; parent_id: string; parent_type: string }>(
    `SELECT id, filename, parent_id, parent_type FROM attachments
     WHERE (parent_type = 'question' AND parent_id = $1)
        OR (parent_type = 'comment' AND parent_id = ANY($2::uuid[]))`,
    [id, comments.map((comment) => comment.id)],
  );
  return (
    <>
      <article className="thread">
        <div className="tags"><span className="tag">Question</span></div>
        <h1 className="title">{question.title}</h1>
        <div className="by">{question.author} · {formatWhen(question.created_at)}</div>
        {question.deadline ? <div className="by">Deadline {formatWhen(question.deadline)}</div> : null}
        <p className="body">{question.body}</p>
        <FileLinks files={files.filter((file) => file.parent_id === question.id)} />
      </article>
      {reminded ? <p className="banner">Reminder sent.</p> : null}
      {question.author_id === user.id ? (
        <form action={remindQuestion}>
          <input type="hidden" name="question_id" value={question.id} />
          <button className="nudge" type="submit">Send a reminder</button>
        </form>
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
      <form action={replyToQuestion} className="stack" style={{ marginTop: 18 }}>
        <input type="hidden" name="question_id" value={question.id} />
        <div>
          <label className="lbl" htmlFor="body">Reply</label>
          <textarea id="body" name="body" required />
        </div>
        <div>
          <label className="lbl" htmlFor="attachments">Attachment</label>
          <input id="attachments" name="attachments" type="file" multiple />
        </div>
        <button className="btn solid" type="submit">Reply</button>
      </form>
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
