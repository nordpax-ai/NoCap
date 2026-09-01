import type { Metadata } from "next";
import Link from "next/link";
import { secretaryNote } from "@/lib/email";

export const metadata: Metadata = { title: "Private area" };

export default function PrivateExplainerPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-slate-lt uppercase">Private area</p>
      <h1 className="mt-3 text-4xl text-ink sm:text-5xl">
        Where the circle actually decides.
      </h1>
      <p className="mt-5 leading-relaxed text-slate">
        Documents, questions and votes live here — not on the public site. Access
        is by invitation. There is no open registration.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-paper"
        >
          Enter private area
        </Link>
        <Link href="/forgot-password" className="text-sm text-slate hover:text-ink">
          Lost your access?
        </Link>
      </div>
      <p className="mt-8 text-sm text-slate">
        Members only. If you’ve lost your access, {secretaryNote()}.
      </p>
    </main>
  );
}
