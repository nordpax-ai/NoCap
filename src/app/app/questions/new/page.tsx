import { createQuestionAction } from "@/app/actions/questions";
import { FlashForm } from "@/components/FlashForm";
import { requireUser } from "@/lib/auth";

export default async function NewQuestionPage() {
  await requireUser();
  return (
    <main className="max-w-xl">
      <h1 className="text-4xl">Open a question</h1>
      <FlashForm action={createQuestionAction} className="mt-8 grid gap-4">
        <label className="grid gap-1.5 text-sm">
          <span>Title</span>
          <input className="field" name="title" required />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>The question</span>
          <textarea className="field min-h-36" name="body" required />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Deadline (optional)</span>
          <input className="field" type="datetime-local" name="deadline" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Attachments (optional)</span>
          <input className="field" type="file" name="attachments" multiple />
        </label>
        <button type="submit" className="inline-flex w-fit rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm text-[var(--paper)]">
          Open and email members
        </button>
      </FlashForm>
    </main>
  );
}
