import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function QuestionsPage() {
  await requireUser();
  const questions = await prisma.question.findMany({
    include: { author: true, _count: { select: { comments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--ink-3)] uppercase">Questions</p>
          <h1 className="mt-2 text-4xl">Ask the circle</h1>
          <p className="mt-3 max-w-xl text-[var(--ink-2)]">
            Separate from votes. Any member may open a question. Anyone may comment.
          </p>
        </div>
        <Link
          href="/app/questions/new"
          className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]"
        >
          Open a question
        </Link>
      </div>
      <ul className="mt-10 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
        {questions.map((q) => (
          <li key={q.id} className="py-5">
            <Link href={`/app/questions/${q.id}`} className="block">
              <h2 className="text-xl">{q.title}</h2>
              <p className="mt-1 text-sm text-[var(--ink-3)]">
                {q.author.name}
                {q.author.status === "DEACTIVATED" ? " (left)" : ""} · {formatDate(q.createdAt)} ·{" "}
                {q._count.comments} {q._count.comments === 1 ? "comment" : "comments"}
                {q.deadline ? ` · deadline ${formatDate(q.deadline)}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
