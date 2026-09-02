"use client";

import { useActionState } from "react";
import Link from "next/link";

type Result = { error?: string; ok?: boolean };

export function ApplyForm({
  action,
}: {
  action: (formData: FormData) => Promise<Result>;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: Result | undefined, formData: FormData) => action(formData),
    undefined,
  );

  if (state?.ok) {
    return (
      <p className="card mt-8 px-5 py-6 text-slate" role="status">
        Thank you. Your note has been stored. The circle will be in touch if
        there is something to say.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 grid gap-4">
      <label className="grid gap-1.5">
        <span className="field-label">Name</span>
        <input className="field" name="name" required autoComplete="name" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Firm and city</span>
        <input className="field" name="firmAndCity" required />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Email</span>
        <input className="field" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Nominated by (optional)</span>
        <input className="field" name="nominatedBy" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Why you want to join</span>
        <textarea className="field min-h-32" name="why" required />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">CV (PDF, 5MB or less)</span>
        <input className="field" name="cv" type="file" accept="application/pdf,.pdf" required />
      </label>
      <label className="flex items-start gap-3 text-sm text-slate">
        <input type="checkbox" name="privacy" required className="mt-1" />
        <span>
          I have read the{" "}
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>{" "}
          and I accept that this note, including my CV, will be stored for the
          purpose of considering membership.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn mt-2 w-fit"
      >
        {pending ? "Sending…" : "Send the note"}
      </button>
      {state?.error ? (
        <p className="text-sm text-[#9b3d2e]" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
