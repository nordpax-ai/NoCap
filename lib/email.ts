import { mkdir, writeFile } from "fs/promises";
import path from "path";
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
  const dir = path.join(process.cwd(), "var", "emails");
  await mkdir(dir, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await writeFile(
    path.join(dir, `${id}.json`),
    JSON.stringify({ id, at: new Date().toISOString(), ...message }, null, 2),
  );
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
