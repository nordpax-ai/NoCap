import Link from "next/link";
import { pool } from "@/lib/db";
import { formatShort, questionStatus } from "@/lib/time";

export const metadata = { title: "Questions" };

export default async function QuestionsPage() {
  const { rows } = await pool.query<{
    id: string;
    title: string;
    created_at: Date;
    deadline: Date | null;
    author: string;
    replies: number;
  }>(
    `SELECT q.id, q.title, q.created_at, q.deadline, p.display_name AS author,
            (SELECT count(*)::int FROM question_comments c WHERE c.question_id = q.id) AS replies
     FROM questions q JOIN profiles p ON p.id = q.author_id
     ORDER BY q.created_at DESC`,
  );
  return (
    <>
      <div className="head">
        <h1 className="page-title">Questions</h1>
        <Link className="act" href="/area/questions/new">Ask a question</Link>
      </div>
      <p className="help">Separate from votes. Anyone can open a question and anyone can reply.</p>
      {rows.map((question) => {
        const status = questionStatus(question.deadline);
        return (
          <article className="thread" key={question.id}>
            <div className="tags">
              <span className="tag">Question</span>
              <span className="dot" />
              <span className={status.open ? "tag now" : "tag"}>{status.text}</span>
            </div>
            <Link className="title" href={`/area/questions/${question.id}`}>{question.title}</Link>
            <div className="by">
              {question.author} · {formatShort(question.created_at)} · {question.replies} {question.replies === 1 ? "reply" : "replies"}
            </div>
          </article>
        );
      })}
    </>
  );
}
