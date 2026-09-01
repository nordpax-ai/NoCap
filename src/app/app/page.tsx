import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { closeExpiredVotes } from "@/lib/close-votes";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requireUser();
  await closeExpiredVotes();

  const [questions, openVotes, docs] = await Promise.all([
    prisma.question.count(),
    prisma.vote.count({ where: { closedAt: null, deadline: { gt: new Date() } } }),
    prisma.document.count(),
  ]);

  return (
    <main>
      <p className="text-xs tracking-[0.16em] text-[var(--ink-3)] uppercase">Private area</p>
      <h1 className="mt-2 text-4xl">Good to see you, {user.name.split(" ")[0]}.</h1>
      <p className="mt-3 max-w-xl text-[var(--ink-2)]">
        One place for your profile, the documents, the questions, and the votes.
        Questions and votes stay separate.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        <DashCard href="/app/profile" kicker="You" title="Your profile" body="Photo, firm, city, practice and contacts — the same record as the public Members page." />
        <DashCard href="/app/documents" kicker={`${docs} files`} title="Documents" body="Official register and the shared folder. Versioned and downloadable." />
        <DashCard href="/app/questions" kicker={`${questions} open threads`} title="Questions" body="Any member can open a question. Anyone can comment. Email follows the thread." />
        <DashCard href="/app/votes" kicker={`${openVotes} open`} title="Votes" body="Admin opens. You vote once. The roll-call is public. Closed records are immutable." />
      </ul>
    </main>
  );
}

function DashCard({
  href,
  kicker,
  title,
  body,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block h-full rounded-2xl border border-[var(--rule)] bg-white/60 p-5 transition hover:border-[var(--ink-3)]"
      >
        <p className="text-xs tracking-[0.12em] text-[var(--ink-3)] uppercase">{kicker}</p>
        <h2 className="mt-2 text-2xl">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">{body}</p>
      </Link>
    </li>
  );
}
