import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { sendContactMessage } from "@/lib/contact-actions";

export const metadata = { title: "Contact" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { error, sent } = await searchParams;
  return (
    <div className="wrap inner">
      <div className="mb-form">
        <div className="eyebrow">Contact</div>
        <h1 className="pt">Write to the Club</h1>
        {sent ? (
          <p className="mb-ask">Thank you. Your message has reached the Club and we will reply by email.</p>
        ) : (
          <>
            <p className="mb-ask">Send us a message and we will reply by email.</p>
            {error ? <p className="note">{error}</p> : null}
            <ActionForm action={sendContactMessage}>
              <div className="fld">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" autoComplete="name" maxLength={120} required />
              </div>
              <div className="fld">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
              </div>
              <div className="fld">
                <label htmlFor="subject">Subject (optional)</label>
                <input id="subject" name="subject" type="text" maxLength={200} />
              </div>
              <div className="fld">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" rows={7} maxLength={5000} required />
              </div>
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <SubmitButton className="btn" dark>Send</SubmitButton>
            </ActionForm>
            <p className="file-note" style={{ marginTop: 18 }}>
              We use your name and email only to reply. See the <a href="/privacy">privacy policy</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
