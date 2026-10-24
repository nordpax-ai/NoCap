import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import { formatWhen } from "@/lib/time";

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await pool.query<{
    name: string;
    firm_and_city: string;
    email: string;
    proposing_member: string | null;
    practice_description: string;
    cv_filename: string | null;
    created_at: Date;
  }>(
    `SELECT name, firm_and_city, email, proposing_member, practice_description, cv_filename, created_at
     FROM applications WHERE id = $1`,
    [id],
  );
  const application = rows[0];
  if (!application) notFound();
  return (
    <>
      <h1 className="page-title">{application.name}</h1>
      <p className="by">{formatWhen(application.created_at)}</p>
      <p className="body">Firm and city: {application.firm_and_city}</p>
      <p className="body">Email: {application.email}</p>
      <p className="body">Proposing member: {application.proposing_member || "—"}</p>
      <p className="body">{application.practice_description}</p>
      {application.cv_filename ? (
        <p style={{ marginTop: 16 }}>
          <a className="dl" href={`/api/applications/${id}/cv`}>{application.cv_filename}</a>
        </p>
      ) : null}
      <p style={{ marginTop: 18 }}><Link href="/area/applications">All applications</Link></p>
    </>
  );
}
