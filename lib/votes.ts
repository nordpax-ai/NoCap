import { pool } from "./db";
import { buildVoteRecordPdf, type VoteRecord } from "./pdf";
import { storageExists, storageGet, storagePut } from "./storage";

export async function closeDueVotes(): Promise<void> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM votes WHERE status = 'open' AND deadline <= now()`,
  );
  if (rows.length === 0) return;
  await pool.query(`SELECT private.close_due_votes()`);
  for (const row of rows) {
    await ensureVotePdf(row.id);
  }
}

export async function loadVoteRecord(voteId: string): Promise<VoteRecord | null> {
  const { rows } = await pool.query<{
    subject: string;
    description: string;
    opened_at: Date;
    closed_at: Date;
    deadline: Date;
    quorum_constitutive: number;
    quorum_deliberative: number;
    eligible_count: number;
    voted_count: number;
    for_count: number;
    against_count: number;
    abstain_count: number;
    constitutive_met: boolean;
    deliberative_met: boolean;
    outcome: string;
  }>(
    `SELECT subject, description, opened_at, closed_at, deadline,
            quorum_constitutive, quorum_deliberative,
            eligible_count, voted_count, for_count, against_count, abstain_count,
            constitutive_met, deliberative_met, outcome
     FROM votes WHERE id = $1 AND status = 'closed'`,
    [voteId],
  );
  const vote = rows[0];
  if (!vote) return null;
  const { rows: voters } = await pool.query<{
    display_name: string;
    email: string;
    choice: string | null;
    cast_at: Date | null;
  }>(
    `SELECT p.display_name, p.email, b.choice, b.cast_at
     FROM vote_electorate e
     JOIN profiles p ON p.id = e.profile_id
     LEFT JOIN ballots b ON b.vote_id = e.vote_id AND b.voter_id = e.profile_id
     WHERE e.vote_id = $1
     ORDER BY p.display_name`,
    [voteId],
  );
  return {
    subject: vote.subject,
    description: vote.description,
    openedAt: vote.opened_at,
    closedAt: vote.closed_at,
    deadline: vote.deadline,
    quorumConstitutive: Number(vote.quorum_constitutive),
    quorumDeliberative: Number(vote.quorum_deliberative),
    eligibleCount: vote.eligible_count,
    votedCount: vote.voted_count,
    forCount: vote.for_count,
    againstCount: vote.against_count,
    abstainCount: vote.abstain_count,
    constitutiveMet: vote.constitutive_met,
    deliberativeMet: vote.deliberative_met,
    outcome: vote.outcome,
    voters: voters.map((voter) => ({
      name: voter.display_name,
      email: voter.email,
      choice: voter.choice,
      castAt: voter.cast_at,
    })),
  };
}

export function recordKey(voteId: string): string {
  return `records/${voteId}.pdf`;
}

export async function ensureVotePdf(voteId: string): Promise<Buffer> {
  const key = recordKey(voteId);
  if (await storageExists(key)) return storageGet(key);
  const record = await loadVoteRecord(voteId);
  if (!record) throw new Error("That vote has no closed record.");
  const pdf = await buildVoteRecordPdf(record);
  await storagePut(key, pdf, "application/pdf");
  return pdf;
}
