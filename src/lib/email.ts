import nodemailer from "nodemailer";
import { prisma } from "./prisma";

type Mail = { to: string | string[]; subject: string; text: string };

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendMail({ to, subject, text }: Mail) {
  const recipients = Array.isArray(to) ? to : [to];
  const joined = recipients.join(", ");

  if (!smtpConfigured()) {
    await prisma.emailLog.create({
      data: { to: joined, subject, body: text, via: "log" },
    });
    console.info(`[email:log] to=${joined} subject=${subject}\n${text}\n`);
    return { via: "log" as const };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: joined,
    subject,
    text,
  });

  await prisma.emailLog.create({
    data: { to: joined, subject, body: text, via: "smtp" },
  });
  return { via: "smtp" as const };
}

export function appUrl(path = "") {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export function secretaryNote() {
  const email = process.env.SECRETARY_EMAIL;
  if (email) return `write to the Secretary at ${email}`;
  return "write to the Secretary";
}
