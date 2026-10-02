import { readdir, readFile } from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";

export const metadata = { title: "Email log" };

export default async function DevMailPage() {
  if (process.env.EMAIL_PROVIDER === "smtp" || process.env.NODE_ENV === "production") notFound();
  const dir = path.join(process.cwd(), "var", "emails");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort().reverse();
  } catch {
    files = [];
  }
  const messages = await Promise.all(
    files.slice(0, 50).map(async (file) => JSON.parse(await readFile(path.join(dir, file), "utf8")) as {
      at: string;
      to: string[];
      subject: string;
      text: string;
    }),
  );
  return (
    <div className="mem">
      <div className="wrap">
        <h1 className="page-title">Email log</h1>
        <p className="help">Local preview only. Nothing is sent. This page is hidden when email is set to SMTP or the app is in production.</p>
        {messages.map((message, index) => (
          <article className="thread" key={`${message.at}-${index}`}>
            <div className="by">{message.at} · {message.to.join(", ")}</div>
            <h2 className="title">{message.subject}</h2>
            <p className="body">{message.text}</p>
          </article>
        ))}
        {messages.length === 0 ? <p className="muted">No messages yet.</p> : null}
      </div>
    </div>
  );
}
