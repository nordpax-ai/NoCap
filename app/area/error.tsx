"use client";

export default function AreaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[nocap] area error", error.digest || error.message);
  return (
    <article className="thread">
      <h1 className="title">This page didn&apos;t load.</h1>
      <p className="by">The members&apos; area hit a problem. Nothing was changed. Try again.</p>
      <button className="btn solid" type="button" onClick={() => reset()} style={{ marginTop: 16 }}>
        Try again
      </button>
    </article>
  );
}
