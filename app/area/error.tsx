"use client";

import { useState } from "react";

export default function AreaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [busy, setBusy] = useState(false);
  console.error("[nocap] area error", error.digest || error.message);
  return (
    <article className="thread">
      <h1 className="title">This page didn&apos;t load.</h1>
      <p className="by">The members&apos; area hit a problem. Nothing was changed. Try again.</p>
      <button className="btn solid" type="button" disabled={busy} aria-busy={busy} onClick={() => { setBusy(true); reset(); }} style={{ marginTop: 16 }}>
        {busy ? <><span className="spinner on-dark" aria-hidden="true" />Loading...</> : "Try again"}
      </button>
    </article>
  );
}
