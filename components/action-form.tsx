"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export const FormBusy = createContext(false);

function ReleaseLock({ onIdle }: { onIdle: () => void }) {
  const { pending } = useFormStatus();
  const seen = useRef(false);
  useEffect(() => {
    if (pending) seen.current = true;
    else if (seen.current) {
      seen.current = false;
      onIdle();
    }
  }, [pending, onIdle]);
  return null;
}

export function ActionForm({
  action,
  className,
  children,
  method = "post",
  style,
}: {
  action: ((formData: FormData) => void | Promise<void>) | string;
  className?: string;
  children: React.ReactNode;
  method?: "get" | "post";
  style?: React.CSSProperties;
}) {
  const [token] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const tracked = typeof action === "function";
  const release = useCallback(() => {
    lock.current = false;
    setBusy(false);
  }, []);

  return (
    <FormBusy.Provider value={busy}>
      <form
        action={action}
        className={className}
        style={style}
        method={tracked ? undefined : method}
        onSubmit={(event) => {
          if (lock.current) {
            event.preventDefault();
            return;
          }
          lock.current = true;
          setBusy(true);
        }}
      >
        <ReleaseLock onIdle={release} />
        {tracked ? <input type="hidden" name="idempotency_key" value={token} /> : null}
        {children}
      </form>
    </FormBusy.Provider>
  );
}
