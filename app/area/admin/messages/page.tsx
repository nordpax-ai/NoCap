import Link from "next/link";
import { DateTime } from "luxon";
import { requireAdmin } from "@/lib/auth";
import { pool } from "@/lib/db";
import { archiveMessage, markMessageRead } from "@/lib/contact-actions";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

type Row = { id: string; name: string; email: string; subject: string | null; message: string; created_at: Date; read_at: Date | null; archived: boolean };

function madrid(value: Date): string {
  return DateTime.fromJSDate(value).setZone("Europe/Madrid").toFormat("d LLL yyyy, HH:mm ZZZZ");
}

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireAdmin();
  const archived = (await searchParams).view === "archived";
  const { rows } = await pool.query<Row>(
    `SELECT id, name, email, subject, message, created_at, read_at, archived
     FROM contact_messages WHERE archived = $1 ORDER BY created_at DESC LIMIT 200`,
    [archived],
  );
  const { rows: count } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM contact_messages WHERE read_at IS NULL AND NOT archived`,
  );
  return (
    <>
      <h1 className="page-title">Messages</h1>
      <p className="help">
        Messages from the public contact form. Unread: <strong>{count[0].n}</strong>.{" "}
        {archived ? <Link href="/area/admin/messages">Show inbox</Link> : <Link href="/area/admin/messages?view=archived">Show archived</Link>}
      </p>
      {rows.length === 0 ? <p className="muted">{archived ? "No archived messages." : "No messages."}</p> : null}
      {rows.map((m) => (
        <section key={m.id} style={{ borderTop: "1px solid #ddd", padding: "16px 0" }}>
          <p style={{ margin: 0 }}>
            {m.read_at ? null : <strong>● Unread · </strong>}
            <strong>{m.subject || "(no subject)"}</strong>
          </p>
          <p className="help" style={{ margin: "4px 0" }}>
            {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a> · {madrid(m.created_at)}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <form action={markMessageRead}>
              <input type="hidden" name="id" value={m.id} />
              {m.read_at ? <input type="hidden" name="unread" value="1" /> : null}
              <button type="submit">{m.read_at ? "Mark unread" : "Mark read"}</button>
            </form>
            <form action={archiveMessage}>
              <input type="hidden" name="id" value={m.id} />
              {archived ? <input type="hidden" name="restore" value="1" /> : null}
              <button type="submit">{archived ? "Restore" : "Archive"}</button>
            </form>
          </div>
        </section>
      ))}
    </>
  );
}
