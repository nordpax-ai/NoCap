"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[nocap] page error", error.digest || error.message);
  return (
    <div className="pub">
      <div className="wrap inner">
        <div className="eyebrow">nocap</div>
        <h1 className="pt">This page didn&apos;t load.</h1>
        <p className="lede">Something went wrong on the server. Try again in a moment.</p>
        <button className="btn" type="button" onClick={() => reset()} style={{ marginTop: 28 }}>
          Try again
        </button>
      </div>
    </div>
  );
}
