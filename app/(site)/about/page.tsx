export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="wrap inner">
      <div className="eyebrow">About</div>
      <h1 className="pt">A circle, not a network.</h1>
      <p className="about-lede">
        It started the way these things should: a group of lawyers who met working on deals across Europe and New York, kept in touch, and realised the contact list was worth more than any organisation they belonged to.
      </p>
      <div className="about-grid">
        <div className="about-col">
          <h3>Where we come from</h3>
          <p>
            nocap was founded by a small group of European deal lawyers who had already been calling each other for years — for a fast read on a local issue, a name in another market, a second opinion nobody else could give. We decided to make it deliberate.
          </p>
        </div>
        <div className="about-col">
          <h3>What we&apos;re for</h3>
          <p>
            To build genuine relationships between the people who will be running European transactions for the next twenty years, and to make those relationships useful: shared knowledge, individual visibility, and time spent together.
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
