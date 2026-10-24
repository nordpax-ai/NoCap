"use client";

import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export const FormBusy = createContext(false);

// Netlify Functions reject request bodies over ~6 MB before the app sees them,
// so check uploads in the browser and keep the server limit below that.
export const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

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
  const [sizeError, setSizeError] = useState<string | null>(null);
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
          let total = 0;
          for (const input of Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"]'))) {
            if (input.dataset.clientResize === "true") continue;
            for (const file of Array.from(input.files || [])) total += file.size;
          }
          if (total > MAX_UPLOAD_BYTES) {
            event.preventDefault();
            setSizeError(
              `That file is ${(total / 1024 / 1024).toFixed(1)} MB. The limit is 4.5 MB per upload. Compress it or split it into parts and try again.`,
            );
            return;
          }
          setSizeError(null);
          lock.current = true;
          setBusy(true);
        }}
      >
        <ReleaseLock onIdle={release} />
        {tracked ? <input type="hidden" name="idempotency_key" value={token} /> : null}
        {sizeError ? <p className="note" role="alert">{sizeError}</p> : null}
        {children}
      </form>
    </FormBusy.Provider>
  );
}
