import Link from "next/link";
import { pool } from "@/lib/db";
import { formatWhen } from "@/lib/time";

export const metadata = { title: "Publications" };

export default async function PublicationsPage() {
  const { rows } = await pool.query<{
    slug: string;
    title: string;
    category: string;
    summary: string;
    published_on: Date;
    is_example: boolean;
    display_name: string | null;
    city: string | null;
  }>(
    `SELECT pub.slug, pub.title, pub.category, pub.summary, pub.published_on, pub.is_example,
            p.display_name, p.city
     FROM publications pub
     LEFT JOIN profiles p ON p.id = pub.author_id
     ORDER BY pub.published_on DESC`,
  );
  return (
    <div className="wrap inner">
      <div className="eyebrow">Publications</div>
      <h1 className="pt">
        Written by members,
        <br />
        for people who do the work.
      </h1>
      <p className="lede">
        Short pieces on deal features and structuring quirks, legislative developments and market trends — signed by the member who wrote them.
      </p>
      {rows.some((row) => row.is_example) ? (
        <p className="note" style={{ marginTop: 28 }}>
          Example pieces from the design mockup. Not real publications.
        </p>
      ) : null}
      <div className="pubs-grid">
        {rows.map((row) => (
          <Link className="pub-card" href={`/publications/${row.slug}`} key={row.slug}>
            <div className="pub-kicker">{row.category}</div>
            <h3>{row.title}</h3>
            <p>{row.summary}</p>
            <div className="pub-by">
              <b>{row.display_name || "A member"}</b>
              {row.city ? ` · ${row.city}` : ""} · {formatWhen(row.published_on, false)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
