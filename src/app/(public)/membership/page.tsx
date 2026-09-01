import type { Metadata } from "next";
import Link from "next/link";
import { submitApplicationAction } from "@/app/actions/apply";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Membership" };

export default function MembershipPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-xs tracking-[0.18em] text-slate-lt uppercase">Membership</p>
      <h1 className="mt-3 text-4xl text-ink sm:text-5xl">How you get in.</h1>
      <p className="mt-5 leading-relaxed text-slate">
        nocap is nomination-only and capped. There is no open application on the
        home page, and no recruiting funnel.
      </p>

      <ol className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ["01", "Nomination", "A member puts a name forward. That is how the circle grows — slowly."],
          ["02", "Review", "The circle looks at the person, not the letterhead."],
          ["03", "Invitation", "If there is a seat, an invitation follows. There is no open register."],
        ].map(([n, t, d]) => (
          <li key={n} className="rounded-2xl border border-line bg-white/60 p-5">
            <p className="text-xs tracking-[0.16em] text-slate-lt">{n}</p>
            <h2 className="mt-2 text-xl">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate">{d}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 border-t border-line pt-12">
        <p className="leading-relaxed text-slate">
          If you are interested in joining, write with a short CV and why you
          want to be part of the circle.
        </p>
        <ApplyForm action={submitApplicationAction} />
        <p className="mt-6 text-xs leading-relaxed text-slate-lt">
          Submissions are stored. Optional email notification is configured with
          environment variables and is not wired to a live inbox in this build.
          See the <Link href="/privacy" className="underline">privacy notice</Link>.
        </p>
      </div>
    </main>
  );
}
