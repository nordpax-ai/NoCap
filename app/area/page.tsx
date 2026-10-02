import Link from "next/link";
import { DocIcon } from "@/components/members-shell";
import { requireUser } from "@/lib/auth";
import { fetchDashboard } from "@/lib/area-data";
import { formatShort, questionStatus } from "@/lib/time";
import { closedVoteLine } from "@/lib/poll";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await fetchDashboard();

  return (
    <>
      <div className="head">
        <div className="eyebrow">Documents</div>
        <Link className="act" href="/area/documents">Open the library</Link>
      </div>
      <div className="docs">
        {data.register.map((doc) => (
          <Link className="doc" href="/area/documents" key={doc.title}>
            <DocIcon />
            <span className="doc-name">{doc.title}</span>
            <span className="doc-meta">v{doc.versions} · {formatShort(doc.uploaded_at)}</span>
          </Link>
        ))}
        <Link className="doc" href="/area/documents">
          <DocIcon folder />
          <span className="doc-name">Minutes</span>
          <span className="doc-meta">{data.minutes} files</span>
        </Link>
        <Link className="doc" href="/area/documents">
          <DocIcon folder />
          <span className="doc-name">Resolutions</span>
          <span className="doc-meta">{data.resolutions} files</span>
        </Link>
      </div>

      <div className="head">
        <div className="eyebrow">Votes</div>
        {user.role === "admin" ? <Link className="act" href="/area/votes/new">Open a vote</Link> : <Link className="act" href="/area/votes">All votes</Link>}
      </div>
      {data.votes.map((vote) => (
        <article className={vote.status === "open" ? "thread open" : "thread"} key={vote.id}>
          <div className="tags">
            <span className={vote.status === "open" ? "tag now" : "tag"}>{vote.status === "open" ? "Vote open" : "Closed"}</span>
            {vote.kind === "poll" ? (
              <>
                <span className="dot" />
                <span className="tag">Poll</span>
              </>
            ) : null}
          </div>
          <Link className="title" href={`/area/votes/${vote.id}`}>{vote.subject}</Link>
          {vote.status === "open" ? (
            <div className="by">{vote.ballots} of {vote.eligible} voted · closes {formatShort(vote.deadline)}</div>
          ) : (
            <div className="by">{vote.author} · {formatShort(vote.opened_at)}</div>
          )}
          {vote.status === "closed" && vote.outcome ? (
            <div className="result">{closedVoteLine(vote)}</div>
          ) : null}
        </article>
      ))}

      <div className="head" style={{ marginTop: 36 }}>
        <div className="eyebrow">Questions</div>
        <Link className="act" href="/area/questions/new">Ask a question</Link>
      </div>
      {data.questions.length === 0 ? <p className="muted">No open questions.</p> : null}
      {data.questions.map((question) => {
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
