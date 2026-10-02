import { requireAdmin } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatWhen } from "@/lib/time";

export const metadata = { title: "Email outbox" };

export default async function OutboxPage() {
  await requireAdmin();
  const { rows } = await pool.query<{
    id: string;
    created_at: Date;
    recipients: string[];
    subject: string;
    body: string;
  }>(`SELECT id, created_at, recipients, subject, body FROM email_log ORDER BY created_at DESC LIMIT 100`);
  return (
    <>
      <h1 className="page-title">Email outbox</h1>
      <p className="help">
        The log driver does not send mail. Invite links, vote notices and application messages are stored here so they can be opened on this demo.
      </p>
      {rows.length === 0 ? <p className="muted">No messages yet.</p> : null}
      {rows.map((message) => (
        <article className="thread" key={message.id}>
          <div className="by">{formatWhen(message.created_at)} · {message.recipients.join(", ")}</div>
          <h2 className="title">{message.subject}</h2>
          <p className="body" style={{ whiteSpace: "pre-wrap" }}>{message.body}</p>
        </article>
      ))}
    </>
  );
}
