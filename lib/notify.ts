import { pool } from "./db";
import { appLink, sendEmail } from "./email";
import { unsubscribeToken } from "./unsubscribe";

export type Notice = {
  recipientId: string;
  email: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  eventKey: string;
};

// Inserts one row per recipient. Email goes out only for a new row, so a
// repeated event (the same reminder, the same close) cannot send twice.
export async function notifyMany(notices: Notice[]): Promise<number> {
  let sent = 0;
  for (const notice of notices) {
    if (!notice.email) continue;
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO notifications (recipient_id, kind, title, body, href, event_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (recipient_id, event_key) DO NOTHING
       RETURNING id`,
      [notice.recipientId, notice.kind, notice.title, notice.body, notice.href, notice.eventKey],
    );
    if (rows.length === 0) continue;
    const pref = await pool.query<{ email_notifications: boolean }>(
      `SELECT email_notifications FROM profiles WHERE id = $1`,
      [notice.recipientId],
    );
    if (!pref.rows[0]?.email_notifications) continue;
    sent += 1;
    await sendEmail({
      to: [notice.email],
      subject: notice.title,
      text:
        `${notice.body}\n\n${appLink(notice.href)}\n\n--\n` +
        `Stop these emails: ${appLink(`/unsubscribe/${unsubscribeToken(notice.recipientId)}`)}\n`,
    });
  }
  return sent;
}
