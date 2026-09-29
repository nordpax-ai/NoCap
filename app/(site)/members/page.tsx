import { pool } from "@/lib/db";

export const metadata = { title: "Members" };

const GRADIENTS: Record<string, string> = {
  "Elena Rossi": "linear-gradient(140deg,#F0A88E,#F2CDBD 55%,#E6E2E4)",
  "Lukas Brandt": "linear-gradient(140deg,#B9C6E4,#D5DCEC 55%,#EFEBE7)",
  "Sofie Jansen": "linear-gradient(140deg,#E6E2E4,#F0C7B6 60%,#F0A88E)",
  "Camille Baptiste": "linear-gradient(140deg,#CBD5EA,#E8E2E2 60%,#F0B79E)",
  "Andrés Vidal": "linear-gradient(140deg,#F0A88E,#E8C4BC 55%,#C6CFE6)",
  "Erik Lindqvist": "linear-gradient(140deg,#D9E0EE,#EDE7E3 55%,#F2CDBD)",
  "Paolo Piccirilli": "linear-gradient(140deg,#131F30,#5E6B7E 55%,#B9C6E4)",
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default async function MembersPage() {
  const { rows } = await pool.query<{
    id: string;
    display_name: string;
    public_role: string | null;
    bio: string | null;
    city: string | null;
    jurisdiction: string | null;
    photo_key: string | null;
    is_example: boolean;
  }>(
    `SELECT id, display_name, public_role, bio, city, jurisdiction, photo_key, is_example
     FROM profiles WHERE status = 'active' ORDER BY display_name`,
  );
  const examples = rows.some((row) => row.is_example);
  return (
    <div className="wrap inner">
      <div className="eyebrow">Members</div>
      <h1 className="pt">The people, not the letterheads.</h1>
      <p className="lede">
        Twelve lawyers across eight European jurisdictions, working on M&amp;A, private equity, venture capital and corporate transactions - with their story, their practice, their market and the firm they sit in.
      </p>
      {examples ? (
        <p className="note" style={{ marginTop: 28 }}>
          Example profiles from the design mockup. These are placeholders, not the real membership.
        </p>
      ) : null}
      <div className="mem-grid">
        {rows.map((member) => (
          <article className="mem" key={member.id}>
            <div
              className="mem-photo"
              style={{ background: GRADIENTS[member.display_name] || "linear-gradient(140deg,#B9C6E4,#E8E2E2 60%,#F0A88E)" }}
            >
              {member.photo_key ? (
                <img src={`/api/photos/${member.id}`} alt="" />
              ) : (
                <span className="mem-initials">{initials(member.display_name)}</span>
              )}
            </div>
            <div className="mem-body">
              <h3>{member.display_name}</h3>
              {member.public_role ? <div className="mem-role">{member.public_role}</div> : null}
              {member.bio ? <p>{member.bio}</p> : null}
              <div className="mem-meta">
                {[member.city, member.jurisdiction].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
