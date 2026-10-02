import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import { formatWhen } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { rows } = await pool.query<{ title: string }>(`SELECT title FROM publications WHERE slug = $1`, [slug]);
  return { title: rows[0]?.title || "Publication" };
}

export default async function PublicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { rows } = await pool.query<{
    title: string;
    category: string;
    summary: string;
    body: string;
    published_on: Date;
    pdf_key: string | null;
    display_name: string | null;
    city: string | null;
  }>(
    `SELECT pub.title, pub.category, pub.summary, pub.body, pub.published_on, pub.pdf_key,
            p.display_name, p.city
     FROM publications pub LEFT JOIN profiles p ON p.id = pub.author_id
     WHERE pub.slug = $1`,
    [slug],
  );
  const publication = rows[0];
  if (!publication) notFound();
  return (
    <div className="wrap inner">
      <article className="article">
        <div className="eyebrow">{publication.category}</div>
        <h1 className="pt">{publication.title}</h1>
        <p className="lede">
          <b>{publication.display_name || "A member"}</b>
          {publication.city ? ` · ${publication.city}` : ""} · {formatWhen(publication.published_on, false)}
        </p>
        <div className="body" style={{ marginTop: 28 }}>{publication.body}</div>
        {publication.pdf_key ? (
          <p style={{ marginTop: 28 }}>
            <a className="btn" href={`/api/publications/${slug}/pdf`}>Download PDF</a>
          </p>
        ) : null}
        <p style={{ marginTop: 28 }}>
          <Link href="/publications">All publications</Link>
        </p>
      </article>
    </div>
  );
}
