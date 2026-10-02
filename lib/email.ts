import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { pool } from "./db";
import { env } from "./env";

export type EmailMessage = {
  to: string[];
  subject: string;
  text: string;
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  const to = [...new Set(message.to.map((address) => address.trim()).filter(Boolean))];
  if (to.length === 0) return;
  const payload: EmailMessage = { ...message, to };
  if (env.emailProvider() === "smtp") {
    await sendSmtp(payload);
    return;
  }
  await logEmail(payload);
}

async function logEmail(message: EmailMessage): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const at = new Date().toISOString();
  await pool.query(
    `INSERT INTO email_log (id, created_at, recipients, subject, body) VALUES ($1, $2, $3, $4, $5)`,
    [id, at, message.to, message.subject, message.text],
  );
  try {
    const dir = path.join(process.cwd(), "var", "emails");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, `${id}.json`),
      JSON.stringify({ id, at, ...message }, null, 2),
    );
  } catch {
    // The Netlify function filesystem is not a shared mailbox. The database row is the log.
  }
}

async function sendSmtp(message: EmailMessage): Promise<void> {
  const smtp = env.smtp();
  if (!smtp.host) throw new Error("SMTP_HOST is not set");
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  await transport.sendMail({
    from: env.emailFrom(),
    to: message.to.join(", "),
    subject: message.subject,
    text: message.text,
  });
}

export function appLink(pathname: string): string {
  return `${env.appUrl()}${pathname}`;
}
