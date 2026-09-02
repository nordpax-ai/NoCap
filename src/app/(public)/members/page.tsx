import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const members = await prisma.user.findMany({
    where: { status: "ACTIVE", role: "MEMBER" },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Members</p>
      <h1 className="pt mt-4 max-w-2xl">The people, not the letterheads.</h1>
      <p className="lede mt-5 max-w-2xl">
        Membership is personal. It belongs to the member, not the firm. Profiles
        on this page are fed from the private area — when a member leaves, they
        disappear from here.
      </p>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <li key={m.id}>
            <Link href={`/members/${m.slug}`} className="card block h-full p-5 transition hover:border-coral-soft">
              <div className="flex items-start gap-4">
                <Avatar
                  name={m.name}
                  photoSrc={m.photoPath ? `/api/files/${m.photoPath}` : null}
                />
                <div>
                  <h2 className="member-name text-[1.35rem] leading-tight">{m.name}</h2>
                  <p className="member-role mt-1 text-sm">
                    {m.practiceArea || "Deal lawyer"}
                    {m.city ? ` · ${m.city}` : ""}
                  </p>
                  {m.jurisdiction ? (
                    <p className="mt-0.5 text-xs tracking-wide text-slate-lt uppercase">
                      {m.jurisdiction}
                    </p>
                  ) : null}
                </div>
              </div>
              {m.bio ? (
                <p className="mt-4 text-sm leading-relaxed text-slate">{m.bio}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
