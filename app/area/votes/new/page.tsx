import { openVote } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Open a vote" };

export default async function NewVotePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <>
      <h1 className="page-title">Open a vote</h1>
      <p className="help">
        The list of eligible voters freezes when you open the vote. Set both quorums now. The constitutive quorum is the share of eligible voters who must vote for the result to be valid — abstentions count as participation. Example: 11 members and 50% means at least 6 must vote. The deliberative quorum is the share of For among votes cast. Example: 80% means 70% in favour does not pass. The page shows the outcome only.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <form action={openVote} className="stack">
        <div>
          <label className="lbl" htmlFor="subject">Subject</label>
          <input id="subject" name="subject" required />
        </div>
        <div>
          <label className="lbl" htmlFor="description">Description</label>
          <textarea id="description" name="description" required />
        </div>
        <div>
          <label className="lbl" htmlFor="deadline">Deadline</label>
          <input id="deadline" name="deadline" type="datetime-local" step={1} required />
        </div>
        <div>
          <label className="lbl" htmlFor="quorum_constitutive">Constitutive quorum (%)</label>
          <input id="quorum_constitutive" name="quorum_constitutive" type="number" min="0" max="100" step="1" required defaultValue={50} />
        </div>
        <div>
          <label className="lbl" htmlFor="quorum_deliberative">Deliberative quorum (%)</label>
          <input id="quorum_deliberative" name="quorum_deliberative" type="number" min="0" max="100" step="1" required defaultValue={50} />
        </div>
        <div>
          <label className="lbl" htmlFor="attachments">Attachments</label>
          <input id="attachments" name="attachments" type="file" multiple />
        </div>
        <button className="btn solid" type="submit">Open the vote</button>
      </form>
    </>
  );
}
