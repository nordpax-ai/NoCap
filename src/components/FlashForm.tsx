"use client";

import { useActionState } from "react";

type Result = { error?: string; ok?: boolean; message?: string } | void;

export function FlashForm({
  action,
  children,
  className,
  success,
}: {
  action: (formData: FormData) => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  success?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: Result, formData: FormData) => action(formData),
    undefined,
  );

  return (
    <form action={formAction} className={className}>
      {children}
      {pending ? <p className="mt-3 text-sm text-slate">Sending…</p> : null}
      {state && "error" in state && state.error ? (
        <p className="mt-3 text-sm text-[#9b3d2e]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state && state.ok ? (
        <p className="mt-3 text-sm text-[#2f5d50]" role="status">
          {state.message || success || "Saved."}
        </p>
      ) : null}
    </form>
  );
}
