import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Privacy</p>
      <h1 className="pt mt-4">Privacy notice</h1>
      <p className="mt-3 text-sm text-slate-lt">Stub. To be completed before any production hosting.</p>
      <div className="mt-8 space-y-4 leading-relaxed text-slate">
        <p>
          nocap is a non-profit association of individual European deal lawyers,
          not yet incorporated. This page is a placeholder privacy notice for the
          public website and the membership note form.
        </p>
        <p>
          If you send a membership note, we store your name, firm and city, email,
          optional nominator, your message, your CV, and your acceptance of this
          notice. The purpose is to consider whether to begin a nomination
          conversation. We do not use the form as a public mailing list.
        </p>
        <p>
          Hosting will be in the European Union. Automated emails, when
          configured, will also be sent in English. Contact for this project is
          Paolo Piccirilli, via the channel you already have — no committee inbox
          is published here.
        </p>
        <p>
          Member profiles shown on the public Members page come from the private
          area and are removed from public view if the member is deactivated.
        </p>
      </div>
    </main>
  );
}
