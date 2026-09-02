"use client";

import { useActionState } from "react";

type Result = { error?: string } | void;

export function LoginForm({
  action,
  next,
}: {
  action: (formData: FormData) => Promise<Result>;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_p: Result, formData: FormData) => action(formData),
    undefined,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="grid gap-1.5">
        <span className="field-label">Email</span>
        <input className="field" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Password</span>
        <input
          className="field"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn w-fit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state && "error" in state && state.error ? (
        <p className="text-sm text-[#9b3d2e]" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
