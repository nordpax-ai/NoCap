import { deactivateMemberAction, inviteMemberAction } from "@/app/actions/admin";
import { FlashForm } from "@/components/FlashForm";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  await requireAdmin();
  const [members, applications, emails] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.application.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.emailLog.findMany({ orderBy: { sentAt: "desc" }, take: 12 }),
  ]);

  return (
    <main>
      <p className="text-xs tracking-[0.16em] text-[var(--ink-3)] uppercase">Admin</p>
      <h1 className="mt-2 text-4xl">A single administrator</h1>
      <p className="mt-3 max-w-xl text-[var(--ink-2)]">
        Invite members. There is no open registration. Deactivation removes a
        profile from the public Members page; questions, comments and past votes
        remain.
      </p>

      <section className="mt-10 max-w-xl">
        <h2 className="text-2xl">Invite</h2>
        <FlashForm action={inviteMemberAction} className="mt-4 grid gap-3" success="Invitation stored and emailed (or logged).">
          <input className="field" name="name" placeholder="Name" required />
          <input className="field" name="email" type="email" placeholder="Email" required />
          <button type="submit" className="inline-flex w-fit rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">
            Send invitation
          </button>
        </FlashForm>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Members</h2>
        <ul className="mt-4 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <span className="font-medium">{m.name}</span>
                <span className="text-[var(--ink-3)]">
                  {" "}
                  · {m.email} · {m.role.toLowerCase()} · {m.status.toLowerCase()}
                </span>
              </div>
              {m.status !== "DEACTIVATED" && m.role !== "ADMIN" ? (
                <FlashForm action={deactivateMemberAction}>
                  <input type="hidden" name="userId" value={m.id} />
                  <button type="submit" className="underline">
                    Deactivate
                  </button>
                </FlashForm>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Membership notes</h2>
        <ul className="mt-4 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
          {applications.length === 0 ? (
            <li className="py-4 text-sm text-[var(--ink-3)]">None yet.</li>
          ) : (
            applications.map((a) => (
              <li key={a.id} className="py-4 text-sm">
                <p className="font-medium">
                  {a.name} · {a.firmAndCity}
                </p>
                <p className="text-[var(--ink-3)]">
                  {a.email} · {formatDate(a.createdAt)}
                  {a.nominatedBy ? ` · nominated by ${a.nominatedBy}` : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[var(--ink-2)]">{a.why}</p>
                {a.cvPath ? (
                  <a className="mt-2 inline-block underline" href={`/api/files/${a.cvPath}?download=1`}>
                    {a.cvFilename || "CV"}
                  </a>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Email log</h2>
        <p className="mt-1 text-sm text-[var(--ink-3)]">
          Until SMTP is configured, messages are stored here and printed to the server log.
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {emails.map((e) => (
            <li key={e.id} className="rounded-xl border border-[var(--rule)] p-3">
              <p className="text-[var(--ink-3)]">
                {formatDate(e.sentAt)} · {e.via} · {e.to}
              </p>
              <p className="mt-1">{e.subject}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
