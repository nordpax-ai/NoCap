"use client";

import { useActionState } from "react";

type Result = { error?: string } | void;

export function PasswordSetForm({
  action,
  token,
}: {
  action: (formData: FormData) => Promise<Result>;
  token: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_p: Result, formData: FormData) => action(formData),
    undefined,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="grid gap-1.5 text-sm">
        <span>Password</span>
        <input
          className="field"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>Confirm password</span>
        <input
          className="field"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-paper disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
      {state && "error" in state && state.error ? (
        <p className="text-sm text-[#9b3d2e]" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
