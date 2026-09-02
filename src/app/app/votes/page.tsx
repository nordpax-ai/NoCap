import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { closeExpiredVotes } from "@/lib/close-votes";
import { computeVoteOutcome, recordLabel } from "@/lib/votes";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function VotesPage() {
  const user = await requireUser();
  await closeExpiredVotes();
  const votes = await prisma.vote.findMany({
    include: { ballots: true, eligible: true },
    orderBy: { openedAt: "desc" },
  });

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--ink-3)] uppercase">Votes</p>
          <h1 className="mt-2 text-4xl">The roll-call</h1>
          <p className="mt-3 max-w-xl text-[var(--ink-2)]">
            Only the administrator opens a vote. A vote is public, cannot be
            changed, and once closed cannot be edited or deleted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/votes/register"
            className="rounded-full border border-[var(--rule)] px-4 py-2 text-sm"
          >
            Download register
          </a>
          {user.role === "ADMIN" ? (
            <Link
              href="/app/votes/new"
              className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]"
            >
              Open a vote
            </Link>
          ) : null}
        </div>
      </div>
      <ul className="mt-10 space-y-4">
        {votes.map((vote) => {
          const outcome = computeVoteOutcome({
            eligibleCount: vote.eligible.length,
            ballots: vote.ballots.map((b) => ({
              choice: b.choice as "FOR" | "AGAINST" | "ABSTAIN",
            })),
            constitutivePercent: vote.constitutivePercent,
            deliberativePercent: vote.deliberativePercent,
            now: new Date(),
            deadline: vote.deadline,
            closedAt: vote.closedAt,
          });
          return (
            <li key={vote.id}>
              <Link
                href={`/app/votes/${vote.id}`}
                className="block rounded-2xl border border-[var(--rule)] bg-white/60 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`chip ${
                      outcome.isClosed
                        ? "bg-[#f3f1ec] text-[var(--ink-2)]"
                        : "bg-[var(--live-bg)] text-[var(--live)]"
                    }`}
                  >
                    {outcome.isClosed ? "Closed" : "Open"}
                  </span>
                  <span className="text-xs text-[var(--ink-3)]">
                    Deadline {formatDate(vote.deadline)}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl">{vote.object}</h2>
                <p className="mt-2 text-sm text-[var(--ink-2)]">
                  {outcome.voted}/{outcome.eligibleCount} voted
                  {outcome.isClosed ? ` · ${recordLabel(outcome.record)}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
