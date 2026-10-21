"use client";

import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { FormBusy } from "./action-form";

export function SubmitButton({
  children,
  pendingLabel = "Loading...",
  className,
  disabled = false,
  id,
  dark = false,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  dark?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const locked = useContext(FormBusy);
  const busy = pending || locked;
  const onDark = dark || Boolean(className?.split(/\s+/).includes("solid"));
  return (
    <button id={id} name={name} value={value} className={className} type="submit" disabled={busy || disabled} aria-busy={busy}>
      {busy ? (
        <>
          <span className={onDark ? "spinner on-dark" : "spinner"} aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
