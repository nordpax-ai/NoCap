import type { Metadata } from "next";
import Link from "next/link";
import { secretaryNote } from "@/lib/email";

export const metadata: Metadata = { title: "Private area" };

export default function PrivateExplainerPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Private area</p>
      <h1 className="pt mt-4">Where the circle actually decides.</h1>
      <p className="lede mt-5">
        Documents, questions and votes live here — not on the public site. Access
        is by invitation. There is no open registration.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link href="/login" className="btn">
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
