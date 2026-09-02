import { Logo } from "@/components/public/Logo";

const HOME_GRAD =
  "radial-gradient(60% 55% at 20% 80%, #F0A88E 0%, rgba(240,168,142,0) 62%), " +
  "radial-gradient(55% 50% at 80% 16%, #B9C6E4 0%, rgba(185,198,228,0) 62%), " +
  "radial-gradient(70% 60% at 58% 58%, #F2CDBD 0%, rgba(242,205,189,0) 70%), " +
  "#FAF8F5";

export default function HomePage() {
  return (
    <section className="home-hero">
      <div
        className="home-grad"
        aria-hidden
        style={{
          position: "absolute",
          inset: "-30%",
          zIndex: -2,
          background: HOME_GRAD,
        }}
      />
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
