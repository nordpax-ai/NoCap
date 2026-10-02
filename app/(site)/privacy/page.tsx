import { env } from "@/lib/env";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  const contact = env.contactEmail();
  return (
    <div className="wrap inner">
      <div className="eyebrow">Privacy</div>
      <h1 className="pt">Privacy policy</h1>
      <div className="prose">
        <p className="note">
          Placeholder. This is not a finished privacy policy and has not been reviewed by counsel. Replace it before the site collects real applications.
        </p>
        <p>
          nocap is a private association of individual lawyers. This page describes, in outline, how the website handles personal information. The contact address {contact} is a placeholder.
        </p>
        <h2>Membership applications</h2>
        <p>
          If you apply, we ask for your name, firm and city, email, an optional proposing member, a short description of your practice, and a CV. You are asked to accept this notice before the form can be sent.
        </p>
        <p>
          The application is emailed to the Founding Committee and stored so that admins and members can read it in the reserved area, including the CV. It is used only to consider the candidacy.
        </p>
        <h2>Members&apos; area</h2>
        <p>
          Members have an account created by invitation. A profile edited in the reserved area stays there. The public members page shows a separate set of example profiles and does not change when a member saves their account. Questions, comments and votes remain on the record if a member leaves. A vote shows the member&apos;s name and choice to the other members.
        </p>
        <h2>Hosting</h2>
        <p>
          The site is intended to be hosted in the European Union. Account ownership, the email provider and the final hosting arrangement are still to be decided.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about this notice can be sent to <a href={`mailto:${contact}`}>{contact}</a> once that address is real.
        </p>
      </div>
    </div>
  );
}
