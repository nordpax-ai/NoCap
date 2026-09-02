import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-3xl">This page is not here.</h1>
      <p className="mt-3 text-slate">It may have moved, or it may never have been public.</p>
      <Link href="/" className="mt-6 inline-block text-sm underline">
        Back to nocap
      </Link>
    </main>
  );
}
