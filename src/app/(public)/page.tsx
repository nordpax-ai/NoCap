import { Logo } from "@/components/public/Logo";

export default function HomePage() {
  return (
    <section className="wash home-hero">
      <div className="home-cover">
        <Logo size="home" decorative />
        <p className="home-tagline">NextGen European Deal Lawyers</p>
        <div className="home-rule" />
        <p className="home-desc">
          A private European circle for the next generation of lawyers working on
          M&A, private equity, venture capital and corporate transactions. Small
          by design, by invitation, and built by its members.
        </p>
      </div>
    </section>
  );
}
