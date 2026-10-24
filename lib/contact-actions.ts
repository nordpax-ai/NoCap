"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./auth";
import { pool } from "./db";
import { clientHash } from "./registration";

const LIMITS = { name: 120, email: 254, subject: 200, message: 5000 };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) || "").replace(/\r\n/g, "\n").trim();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string): never {
  redirect(`/contact?error=${encodeURIComponent(error)}`);
}

export async function sendContactMessage(formData: FormData) {
  // Honeypot: bots fill every field. Pretend success, store nothing.
  if (text(formData, "website")) redirect("/contact?sent=1");
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const subject = text(formData, "subject");
  const message = text(formData, "message");
  if (!name || !email || !message) fail("Please add your name, email and message.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Please enter a valid email address.");
  if (name.length > LIMITS.name || email.length > LIMITS.email || subject.length > LIMITS.subject || message.length > LIMITS.message) {
    fail("One of the fields is too long.");
  }
  const client = await clientHash();
  const { rows } = await pool.query<{ mine: number; total: number }>(
    `SELECT count(*) FILTER (WHERE client_hash = $1 AND created_at > now() - interval '15 minutes')::int AS mine,
            count(*)::int AS total
     FROM contact_messages WHERE created_at > now() - interval '1 hour'`,
    [client],
  );
  if (rows[0].mine >= 3 || rows[0].total >= 30) fail("Too many messages right now. Please try again later.");
  const { rows: inserted } = await pool.query<{ id: string }>(
    `INSERT INTO contact_messages (name, email, subject, message, client_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, email, subject || null, message, client],
  );
  const id = inserted[0].id;
  // Bell notification to active admins only. No email.
  await pool.query(
    `INSERT INTO notifications (recipient_id, kind, title, body, href, event_key)
     SELECT p.id, 'contact_message', $1, $2, '/area/admin/messages', 'contact:' || $3 || ':' || p.id
     FROM profiles p WHERE p.role = 'admin' AND p.status = 'active'
     ON CONFLICT (recipient_id, event_key) DO NOTHING`,
    [`New contact message: ${name}`.slice(0, 200), subject ? `Subject: ${subject}`.slice(0, 300) : "Sent from the public contact form.", id],
  );
  redirect("/contact?sent=1");
}

export async function markMessageRead(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!UUID.test(id)) redirect("/area/admin/messages");
  const unread = text(formData, "unread") === "1";
  await pool.query(`UPDATE contact_messages SET read_at = ${unread ? "NULL" : "COALESCE(read_at, now())"} WHERE id = $1`, [id]);
  revalidatePath("/area/admin/messages");
  redirect("/area/admin/messages");
}

export async function archiveMessage(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!UUID.test(id)) redirect("/area/admin/messages");
  const restore = text(formData, "restore") === "1";
  await pool.query(
    `UPDATE contact_messages SET archived = $2, read_at = COALESCE(read_at, now()) WHERE id = $1`,
    [id, !restore],
  );
  revalidatePath("/area/admin/messages");
  redirect(restore ? "/area/admin/messages?view=archived" : "/area/admin/messages");
}
