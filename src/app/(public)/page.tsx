import { Logo } from "@/components/public/Logo";

export default function HomePage() {
  return (
    <section className="wash home-hero">
      <div className="home-cover">
        <div className="home-brand">
          <Logo size="home" decorative />
          <p className="home-tagline">NextGen European Deal Lawyers</p>
        </div>
        <hr className="home-rule" />
        <p className="home-desc">
          A private European circle for the next generation of lawyers working on
          M&A, private equity, venture capital and corporate transactions. Small
          by design. Active by rule. Built by its members.
        </p>
      </div>
    </section>
  );
}
