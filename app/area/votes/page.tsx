import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { outcomeLabel } from "@/lib/pdf";
import { formatShort } from "@/lib/time";

export const metadata = { title: "Votes" };

export default async function VotesPage() {
  const user = await requireUser();
  const { rows } = await pool.query<{
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
    voted: number;
    eligible: number;
  }>(
    `SELECT v.id, v.subject, v.status, v.deadline, v.opened_at, v.outcome,
            v.for_count, v.against_count, v.abstain_count, p.display_name AS author,
            (SELECT count(*)::int FROM ballots b WHERE b.vote_id = v.id) AS voted,
            (SELECT count(*)::int FROM vote_electorate e WHERE e.vote_id = v.id) AS eligible
     FROM votes v JOIN profiles p ON p.id = v.opened_by
     ORDER BY (v.status = 'open') DESC, v.opened_at DESC`,
  );
  return (
    <>
      <div className="head">
        <h1 className="page-title">Votes</h1>
        {user.role === "admin" ? <Link className="act" href="/area/votes/new">Open a vote</Link> : null}
      </div>
      <p className="help">Only an admin opens a vote. The vote is open: members can see who voted what. It cannot be changed once cast.</p>
      {rows.map((vote) => (
        <article className={vote.status === "open" ? "thread open" : "thread"} key={vote.id}>
          <div className="tags">
            <span className={vote.status === "open" ? "tag now" : "tag"}>{vote.status === "open" ? "Vote open" : "Closed"}</span>
            <span className="dot" />
            <span className="tag">{vote.status === "open" ? `Closes ${formatShort(vote.deadline)}` : `Closed ${formatShort(vote.deadline)}`}</span>
          </div>
          <Link className="title" href={`/area/votes/${vote.id}`}>{vote.subject}</Link>
          <div className="by">{vote.author} · {vote.voted} of {vote.eligible} voted</div>
          {vote.status === "closed" && vote.outcome ? (
            <div className="result">
              {outcomeLabel(vote.outcome)} {vote.for_count} for, {vote.against_count} against, {vote.abstain_count} abstention{vote.abstain_count === 1 ? "" : "s"}
            </div>
          ) : null}
        </article>
      ))}
    </>
  );
}
