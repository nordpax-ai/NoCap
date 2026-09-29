import Link from "next/link";
import { notFound } from "next/navigation";
import { castVote, remindVoters } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { labelChoice, outcomeLabel } from "@/lib/pdf";
import { formatWhen } from "@/lib/time";

export default async function VotePage({
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
    subject: string;
    description: string;
    status: string;
    deadline: Date;
    opened_at: Date;
    closed_at: Date | null;
    quorum_constitutive: number;
    quorum_deliberative: number;
    outcome: string | null;
    for_count: number | null;
    against_count: number | null;
    abstain_count: number | null;
    eligible_count: number | null;
    voted_count: number | null;
    constitutive_met: boolean | null;
    deliberative_met: boolean | null;
    author: string;
  }>(
    `SELECT v.*, p.display_name AS author
     FROM votes v JOIN profiles p ON p.id = v.opened_by WHERE v.id = $1`,
    [id],
  );
  const vote = rows[0];
  if (!vote) notFound();
  const { rows: roll } = await pool.query<{
    profile_id: string;
    display_name: string;
    choice: string | null;
    cast_at: Date | null;
  }>(
    `SELECT e.profile_id, p.display_name, b.choice, b.cast_at
     FROM vote_electorate e
     JOIN profiles p ON p.id = e.profile_id
     LEFT JOIN ballots b ON b.vote_id = e.vote_id AND b.voter_id = e.profile_id
     WHERE e.vote_id = $1
     ORDER BY (b.choice IS NULL), p.display_name`,
    [id],
  );
  const { rows: files } = await pool.query<{ id: string; filename: string }>(
    `SELECT id, filename FROM attachments WHERE parent_type = 'vote' AND parent_id = $1`,
    [id],
  );
  const mine = roll.find((person) => person.profile_id === user.id);
  const voted = roll.filter((person) => person.choice);
  const waiting = roll.filter((person) => !person.choice);
  const open = vote.status === "open";

  return (
    <>
      <article className={open ? "thread open" : "thread"}>
        <div className="tags">
          <span className={open ? "tag now" : "tag"}>{open ? "Vote open" : "Closed"}</span>
          <span className="dot" />
          <span className="tag">{open ? `Closes ${formatWhen(vote.deadline)}` : `Closed ${formatWhen(vote.closed_at || vote.deadline)}`}</span>
        </div>
        <h1 className="title">{vote.subject}</h1>
        <div className="by">{vote.author} · {formatWhen(vote.opened_at)}</div>
        <p className="body">{vote.description}</p>
        <p className="by">
          Constitutive quorum {vote.quorum_constitutive}% · deliberative quorum {vote.quorum_deliberative}%
        </p>
        {files.length ? (
          <p className="by">
            {files.map((file) => (
              <a key={file.id} href={`/api/attachments/${file.id}`}>{file.filename} </a>
            ))}
          </p>
        ) : null}

        {open && mine && !mine.choice ? (
          <div className="ballot">
            {(["for", "against", "abstain"] as const).map((choice) => (
              <form action={castVote} key={choice}>
                <input type="hidden" name="vote_id" value={vote.id} />
                <input type="hidden" name="choice" value={choice} />
                <button type="submit">{labelChoice(choice)}</button>
              </form>
            ))}
          </div>
        ) : null}
        {mine?.choice ? (
          <p className="cast">Recorded: {labelChoice(mine.choice)} · {mine.cast_at ? formatWhen(mine.cast_at) : ""}</p>
        ) : null}
        {open && !mine ? <p className="by">You are not on the frozen list of eligible voters.</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {open ? (
          <div className="roll">
            <div className="roll-head">
              <span className="eyebrow">Roll call</span>
              <span className="count">{voted.length} of {roll.length} voted</span>
            </div>
            <div className="names">
              {roll.map((person) => (
                <span className={person.choice ? "chip yes" : "chip wait"} key={person.profile_id}>
                  {person.display_name}{person.choice ? ` · ${labelChoice(person.choice)}` : ""}
                </span>
              ))}
            </div>
            {user.role === "admin" ? (
              <form action={remindVoters}>
                <input type="hidden" name="vote_id" value={vote.id} />
                <button className="nudge" type="submit" disabled={waiting.length === 0}>
                  {waiting.length ? `Remind the ${waiting.length} outstanding` : "Everyone has voted"}
                </button>
              </form>
            ) : null}
            {reminded ? <p className="by">Reminder sent.</p> : null}
          </div>
        ) : (
          <div>
            <div className="result">
              {outcomeLabel(vote.outcome || "")} {vote.for_count} for, {vote.against_count} against, {vote.abstain_count} abstention{vote.abstain_count === 1 ? "" : "s"}
            </div>
            <p className="by">
              Constitutive quorum {vote.constitutive_met ? "met" : "not met"} ({vote.voted_count} of {vote.eligible_count} voted).
              Deliberative quorum {vote.deliberative_met ? "met" : "not met"}.
            </p>
            <div className="names" style={{ margin: "12px 0" }}>
              {roll.map((person) => (
                <span className={person.choice ? "chip yes" : "chip wait"} key={person.profile_id}>
                  {person.display_name}{person.choice ? ` · ${labelChoice(person.choice)}` : " · did not vote"}
                </span>
              ))}
            </div>
            <a className="dl" href={`/api/votes/${vote.id}/record`}>Download the record</a>
          </div>
        )}
      </article>
      <p style={{ marginTop: 16 }}><Link href="/area/votes">All votes</Link></p>
    </>
  );
}
