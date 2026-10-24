"use client";

import { useState } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [busy, setBusy] = useState(false);
  console.error("[nocap] page error", error.digest || error.message);
  return (
    <div className="pub">
      <div className="wrap inner">
        <div className="eyebrow">nocap</div>
        <h1 className="pt">This page didn&apos;t load.</h1>
        <p className="lede">Something went wrong on the server. Try again in a moment.</p>
        <button className="btn" type="button" disabled={busy} aria-busy={busy} onClick={() => { setBusy(true); reset(); }} style={{ marginTop: 28 }}>
          {busy ? <><span className="spinner on-dark" aria-hidden="true" />Loading...</> : "Try again"}
        </button>
      </div>
    </div>
  );
}
