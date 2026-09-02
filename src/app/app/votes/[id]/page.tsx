import { notFound } from "next/navigation";
import { castBallotAction, remindNonVotersAction } from "@/app/actions/votes";
import { FlashForm } from "@/components/FlashForm";
import { requireUser } from "@/lib/auth";
import { ensureVoteClosed } from "@/lib/close-votes";
import { computeVoteOutcome, recordLabel, type VoteChoice } from "@/lib/votes";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function VoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  await ensureVoteClosed(id);
  const vote = await prisma.vote.findUnique({
    where: { id },
    include: {
      openedBy: true,
      attachments: true,
      eligible: { include: { user: true }, orderBy: { nameSnapshot: "asc" } },
      ballots: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!vote) notFound();

  const outcome = computeVoteOutcome({
    eligibleCount: vote.eligible.length,
    ballots: vote.ballots.map((b) => ({ choice: b.choice as VoteChoice })),
    constitutivePercent: vote.constitutivePercent,
    deliberativePercent: vote.deliberativePercent,
    now: new Date(),
    deadline: vote.deadline,
    closedAt: vote.closedAt,
  });

  const mine = vote.ballots.find((b) => b.userId === user.id);
  const votedIds = new Set(vote.ballots.map((b) => b.userId));
  const notVoted = vote.eligible.filter((e) => !votedIds.has(e.userId));
  const eligibleHere = vote.eligible.some((e) => e.userId === user.id);

  return (
    <main>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`chip ${
            outcome.isClosed ? "bg-[#f3f1ec] text-[var(--ink-2)]" : "bg-[var(--live-bg)] text-[var(--live)]"
          }`}
        >
          {outcome.isClosed ? "Closed" : "Live"}
        </span>
        <span className="text-xs text-[var(--ink-3)]">
          Deadline {formatDateTime(vote.deadline)}
        </span>
      </div>
      <h1 className="mt-3 text-4xl">{vote.object}</h1>
      <p className="mt-4 max-w-2xl whitespace-pre-wrap leading-relaxed text-[var(--ink-2)]">
        {vote.description}
      </p>
      <p className="mt-3 text-sm text-[var(--ink-3)]">
        Opened by {vote.openedBy.name} · {formatDateTime(vote.openedAt)}
      </p>
      {vote.attachments.length > 0 ? (
        <ul className="mt-4 text-sm">
          {vote.attachments.map((a) => (
            <li key={a.id}>
              <a className="underline" href={`/api/files/${a.storagePath}?download=1`}>
                {a.filename}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="mt-10 rounded-2xl border border-[var(--rule)] bg-white/70 p-5">
        <h2 className="text-2xl">Shown outcome</h2>
        <p className="mt-1 text-sm text-[var(--ink-3)]">
          The system shows the numbers. It does not interpret them.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>Eligible (frozen at open): {outcome.eligibleCount}</div>
          <div>
            Voted: {outcome.voted} · not voted: {outcome.notVoted}
          </div>
          <div>
            For {outcome.forCount} · Against {outcome.againstCount} · Abstain {outcome.abstainCount}
          </div>
          <div>
            Participation {outcome.participationPercent.toFixed(1)}% — constitutive{" "}
            {outcome.constitutiveRequired}% {outcome.constitutiveMet ? "met" : "not met"}
          </div>
          <div>
            In favour among votes cast {outcome.inFavourPercent.toFixed(1)}% — deliberative{" "}
            {outcome.deliberativeRequired}% {outcome.deliberativeMet ? "met" : "not met"}
          </div>
        </dl>
        {outcome.isClosed ? (
          <p className="mt-4 font-[family-name:var(--ff-news)] text-lg">{recordLabel(outcome.record)}</p>
        ) : null}
        {outcome.isClosed ? (
          <a className="mt-4 inline-block text-sm underline" href={`/api/votes/${vote.id}/pdf`}>
            Download PDF record
          </a>
        ) : null}
      </section>

      {!outcome.isClosed && eligibleHere && !mine ? (
        <section className="mt-8">
          <h2 className="text-2xl">Your vote</h2>
          <p className="mt-1 text-sm text-[var(--ink-3)]">A vote cannot be changed.</p>
          <FlashForm action={castBallotAction} className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="voteId" value={vote.id} />
            {(["FOR", "AGAINST", "ABSTAIN"] as const).map((choice) => (
              <button
                key={choice}
                name="choice"
                value={choice}
                className="rounded-full border border-[var(--rule)] px-4 py-2 text-sm hover:bg-[var(--live-bg)]"
              >
                {choice === "FOR" ? "For" : choice === "AGAINST" ? "Against" : "Abstain"}
              </button>
            ))}
          </FlashForm>
        </section>
      ) : null}
      {mine ? (
        <p className="mt-8 text-sm text-[var(--ink-2)]">
          You voted {mine.choice} on {formatDateTime(mine.createdAt)}. It cannot be changed.
        </p>
      ) : null}

      {!outcome.isClosed && user.role === "ADMIN" ? (
        <FlashForm action={remindNonVotersAction} className="mt-6" success="Reminder sent.">
          <input type="hidden" name="voteId" value={vote.id} />
          <button type="submit" className="text-sm underline">
            Remind those who have not voted
          </button>
        </FlashForm>
      ) : null}

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl">Who voted</h2>
          <ul className="mt-4 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
            {vote.ballots.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  {b.user.name}
                  {b.user.status === "DEACTIVATED" ? " (left)" : ""}
                </span>
                <span className="chip bg-[#f3f1ec]">{b.choice}</span>
              </li>
            ))}
            {vote.ballots.length === 0 ? (
              <li className="py-3 text-sm text-[var(--ink-3)]">No ballots yet.</li>
            ) : null}
          </ul>
        </div>
        {!outcome.isClosed ? (
          <div>
            <h2 className="text-2xl">Who has not</h2>
            <ul className="mt-4 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
              {notVoted.map((e) => (
                <li key={e.id} className="py-3 text-sm">
                  {e.nameSnapshot}
                </li>
              ))}
              {notVoted.length === 0 ? (
                <li className="py-3 text-sm text-[var(--ink-3)]">Everyone eligible has voted.</li>
              ) : null}
            </ul>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl">Eligible list</h2>
            <ul className="mt-4 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
              {vote.eligible.map((e) => (
                <li key={e.id} className="py-3 text-sm">
                  {e.nameSnapshot}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
