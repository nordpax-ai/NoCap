import { notFound } from "next/navigation";
import { commentQuestionAction, nudgeQuestionAction } from "@/app/actions/questions";
import { FlashForm } from "@/components/FlashForm";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      author: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      attachments: true,
    },
  });
  if (!question) notFound();

  const canNudge = question.authorId === user.id || user.role === "ADMIN";

  return (
    <main>
      <p className="text-xs tracking-[0.16em] text-[var(--ink-3)] uppercase">Question</p>
      <h1 className="mt-2 text-4xl">{question.title}</h1>
      <p className="mt-3 text-sm text-[var(--ink-3)]">
        Opened by {question.author.name}
        {question.author.status === "DEACTIVATED" ? " (left)" : ""} ·{" "}
        {formatDateTime(question.createdAt)}
        {question.deadline ? ` · deadline ${formatDateTime(question.deadline)}` : ""}
      </p>
      <p className="mt-6 max-w-2xl whitespace-pre-wrap leading-relaxed text-[var(--ink-2)]">
        {question.body}
      </p>
      {question.attachments.length > 0 ? (
        <ul className="mt-4 text-sm">
          {question.attachments.map((a) => (
            <li key={a.id}>
              <a className="underline" href={`/api/files/${a.storagePath}?download=1`}>
                {a.filename}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {canNudge ? (
        <FlashForm action={nudgeQuestionAction} className="mt-6" success="Nudge sent.">
          <input type="hidden" name="questionId" value={question.id} />
          <button type="submit" className="text-sm underline">
            Send a nudge
          </button>
        </FlashForm>
      ) : null}

      <section className="mt-12">
        <h2 className="text-2xl">Comments</h2>
        <ul className="mt-5 space-y-5">
          {question.comments.map((c) => (
            <li key={c.id} className="border-t border-[var(--rule)] pt-4">
              <p className="text-sm text-[var(--ink-3)]">
                {c.author.name}
                {c.author.status === "DEACTIVATED" ? " (left)" : ""} · {formatDateTime(c.createdAt)}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[var(--ink)]">{c.body}</p>
            </li>
          ))}
        </ul>
        <FlashForm action={commentQuestionAction} className="mt-6 grid max-w-xl gap-3" success="Comment posted.">
          <input type="hidden" name="questionId" value={question.id} />
          <textarea className="field min-h-24" name="body" required placeholder="Write a reply" />
          <button type="submit" className="inline-flex w-fit rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">
            Reply
          </button>
        </FlashForm>
      </section>
    </main>
  );
}
