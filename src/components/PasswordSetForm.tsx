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
      <label className="grid gap-1.5">
        <span className="field-label">Password</span>
        <input
          className="field"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Confirm password</span>
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
        className="btn w-fit"
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
