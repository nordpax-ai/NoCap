export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="wrap inner">
      <div className="eyebrow">About</div>
      <h1 className="pt">A circle, not a network.</h1>
      <p className="about-lede">
        nocap is a private circle of deal lawyers across Europe. Small on purpose, by invitation, and built by the people in it.
      </p>
      <div className="about-grid">
        <div className="about-col">
          <h3>What the name means</h3>
          <p>
            In an SPA, the cap is the ceiling on a party&apos;s liability. No cap: no ceiling. Everywhere else, “no cap” means “for real” - real relationships, not conference-badge networking. Both halves are the point.
          </p>
        </div>
        <div className="about-col">
          <h3>Where we come from</h3>
          <p>
            nocap started with lawyers across Europe who came to know and respect each other, and in time to trust each other. We decided to build something around it.
          </p>
        </div>
        <div className="about-col">
          <h3>What we&apos;re for</h3>
          <p>
            To build genuine relationships between the people who will be running transactions for the next twenty years, and to make those relationships valuable: shared knowledge, a name of your own and time spent together.
          </p>
        </div>
        <div className="about-col">
          <h3>Why it matters</h3>
          <p>
            Cross-border practice runs on trust, and trust sits at partner level or in networks too large to mean anything. We are an association of individuals, small on purpose, where membership belongs to the member and not to the firm.
          </p>
        </div>
      </div>
    </div>
  );
}
