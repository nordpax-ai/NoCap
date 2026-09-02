import { openVoteAction } from "@/app/actions/votes";
import { FlashForm } from "@/components/FlashForm";
import { requireAdmin } from "@/lib/auth";

export default async function NewVotePage() {
  await requireAdmin();
  return (
    <main className="max-w-xl">
      <h1 className="text-4xl">Open a vote</h1>
      <p className="mt-3 text-[var(--ink-2)]">
        Eligible voters freeze at open. A deadline is mandatory. Closed votes
        cannot later be edited or deleted.
      </p>
      <FlashForm action={openVoteAction} className="mt-8 grid gap-4">
        <label className="grid gap-1.5 text-sm">
          <span>Object</span>
          <input className="field" name="object" required />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Description</span>
          <textarea className="field min-h-32" name="description" required />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Deadline</span>
          <input className="field" type="datetime-local" name="deadline" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span>Constitutive quorum %</span>
            <input className="field" type="number" name="constitutivePercent" min={0} max={100} defaultValue={50} required />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span>Deliberative threshold %</span>
            <input className="field" type="number" name="deliberativePercent" min={0} max={100} defaultValue={66} required />
          </label>
        </div>
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
