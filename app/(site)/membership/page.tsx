import Link from "next/link";
import { submitApplication } from "@/lib/actions";

export const metadata = { title: "Membership" };

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  return (
    <div className="wrap inner">
      <div className="eyebrow">Membership</div>
      <h1 className="pt">How you get in.</h1>
      <p className="mb-lede">
        nocap is capped per firm and per jurisdiction. Membership is personal: it belongs to the member, travels with them, and says nothing about their firm.
      </p>
      <div className="mb-steps">
        <div className="mb-step">
          <div className="mb-num">01</div>
          <h3>Nomination</h3>
          <p>Most members arrive because someone already in the circle put their name forward. If you know a member, that is the shortest route.</p>
        </div>
        <div className="mb-step">
          <div className="mb-num">02</div>
          <h3>Review</h3>
          <p>The Committee looks at every candidate against the seats available in that jurisdiction and at that firm. Not every application results in a seat.</p>
        </div>
        <div className="mb-step">
          <div className="mb-num">03</div>
          <h3>Invitation</h3>
          <p>Candidates who are admitted receive an invitation from the Secretary, together with the charter and the code of conduct.</p>
        </div>
      </div>
      <div className="mb-form">
        <h3>Apply</h3>
        <p className="mb-ask">
          If you are interested in joining, write to us with a short CV and a few lines on why you want to be part of the circle.
        </p>
        {sent ? <p className="note ok">Your application has been sent to the Founding Committee.</p> : null}
        {error ? <p className="note">{error}</p> : null}
        <form action={submitApplication}>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="company_website">Company website</label>
            <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="fld">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required placeholder="Your full name" />
          </div>
          <div className="fld">
            <label htmlFor="firm_and_city">Firm and city</label>
            <input id="firm_and_city" name="firm_and_city" required placeholder="Firm, city" />
          </div>
          <div className="fld">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="name@firm.com" />
          </div>
          <div className="fld">
            <label htmlFor="proposing_member">Proposing member, if any</label>
            <input id="proposing_member" name="proposing_member" placeholder="A member's name, if any" />
          </div>
          <div className="fld">
            <label htmlFor="practice_description">Short description of your practice</label>
            <textarea id="practice_description" name="practice_description" required placeholder="What you work on" />
          </div>
          <div className="fld">
            <label htmlFor="cv">CV</label>
            <input id="cv" name="cv" type="file" accept="application/pdf" required />
            <div className="file-note">PDF, up to 5 MB.</div>
          </div>
          <label className="check">
            <input type="checkbox" name="privacy" required />
            <span>
              I have read and accept the <Link href="/privacy">privacy policy</Link>. The application is emailed to the Founding Committee and stored so members can review it in the reserved area.
            </span>
          </label>
          <button className="btn" type="submit">Send application</button>
        </form>
      </div>
    </div>
  );
}
