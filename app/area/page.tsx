import Link from "next/link";
import { DocIcon } from "@/components/members-shell";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatShort, questionStatus } from "@/lib/time";
import { outcomeLabel } from "@/lib/pdf";

export default async function DashboardPage() {
  const user = await requireUser();
  const [register, questions, votes] = await Promise.all([
    pool.query<{ category: string; title: string; versions: number; uploaded_at: Date }>(
      `SELECT d.category, d.title,
              count(v.id)::int AS versions,
              max(v.uploaded_at) AS uploaded_at
       FROM documents d
       JOIN document_versions v ON v.document_id = d.id
       WHERE d.area = 'register' AND d.category IN ('charter', 'code_of_conduct')
       GROUP BY d.id
       ORDER BY d.title`,
    ),
    pool.query<{ id: string; title: string; created_at: Date; deadline: Date | null; author: string; replies: number }>(
      `SELECT q.id, q.title, q.created_at, q.deadline, p.display_name AS author,
              (SELECT count(*)::int FROM question_comments c WHERE c.question_id = q.id) AS replies
       FROM questions q JOIN profiles p ON p.id = q.author_id
       WHERE q.deadline IS NULL OR q.deadline > now()
       ORDER BY q.created_at DESC`,
    ),
    pool.query<{
      id: string;
      subject: string;
      status: string;
      deadline: Date;
      opened_at: Date;
      outcome: string | null;
      for_count: number | null;
      against_count: number | null;
      abstain_count: number | null;
      author: string;
      ballots: number;
      eligible: number;
    }>(
      `SELECT v.id, v.subject, v.status, v.deadline, v.opened_at, v.outcome,
              v.for_count, v.against_count, v.abstain_count, p.display_name AS author,
              (SELECT count(*)::int FROM ballots b WHERE b.vote_id = v.id) AS ballots,
              (SELECT count(*)::int FROM vote_electorate e WHERE e.vote_id = v.id) AS eligible
       FROM votes v JOIN profiles p ON p.id = v.opened_by
       ORDER BY (v.status = 'open') DESC, v.opened_at DESC
       LIMIT 6`,
    ),
  ]);
  const minutes = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM documents WHERE area = 'register' AND category = 'minutes'`,
  );
  const resolutions = await pool.query<{ n: number }>(
    `SELECT (SELECT count(*) FROM documents WHERE category = 'resolution')
          + (SELECT count(*) FROM votes WHERE status = 'closed') AS n`,
  );

  return (
    <>
      <div className="head">
        <div className="eyebrow">Documents</div>
        <Link className="act" href="/area/documents">Open the library</Link>
      </div>
      <div className="docs">
        {register.rows.map((doc) => (
          <Link className="doc" href="/area/documents" key={doc.title}>
            <DocIcon />
            <span className="doc-name">{doc.title}</span>
            <span className="doc-meta">v{doc.versions} · {formatShort(doc.uploaded_at)}</span>
          </Link>
        ))}
        <Link className="doc" href="/area/documents">
          <DocIcon folder />
          <span className="doc-name">Minutes</span>
          <span className="doc-meta">{minutes.rows[0]?.n || 0} files</span>
        </Link>
        <Link className="doc" href="/area/documents">
          <DocIcon folder />
          <span className="doc-name">Resolutions</span>
          <span className="doc-meta">{Number(resolutions.rows[0]?.n || 0)} files</span>
        </Link>
      </div>

      <div className="head">
        <div className="eyebrow">Votes</div>
        {user.role === "admin" ? <Link className="act" href="/area/votes/new">Open a vote</Link> : <Link className="act" href="/area/votes">All votes</Link>}
      </div>
      {votes.rows.map((vote) => (
        <article className={vote.status === "open" ? "thread open" : "thread"} key={vote.id}>
          <div className="tags">
            <span className={vote.status === "open" ? "tag now" : "tag"}>{vote.status === "open" ? "Vote open" : "Closed"}</span>
          </div>
          <Link className="title" href={`/area/votes/${vote.id}`}>{vote.subject}</Link>
          {vote.status === "open" ? (
            <div className="by">{vote.ballots} of {vote.eligible} voted · closes {formatShort(vote.deadline)}</div>
          ) : (
            <div className="by">{vote.author} · {formatShort(vote.opened_at)}</div>
          )}
          {vote.status === "closed" && vote.outcome ? (
            <div className="result">
              {outcomeLabel(vote.outcome)} {vote.for_count} for, {vote.against_count} against, {vote.abstain_count} abstention{vote.abstain_count === 1 ? "" : "s"}
            </div>
          ) : null}
        </article>
      ))}

      <div className="head" style={{ marginTop: 36 }}>
        <div className="eyebrow">Questions</div>
        <Link className="act" href="/area/questions/new">Ask a question</Link>
      </div>
      {questions.rows.length === 0 ? <p className="muted">No open questions.</p> : null}
      {questions.rows.map((question) => {
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
      <p className="muted" style={{ marginTop: 8 }}>Signed in as {user.display_name}. Open questions are the ones without a passed deadline.</p>
    </>
  );
}
