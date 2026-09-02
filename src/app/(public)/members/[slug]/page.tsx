import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const member = await prisma.user.findUnique({ where: { slug } });
  return { title: member?.name ?? "Member" };
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await prisma.user.findUnique({ where: { slug } });
  if (!member || member.status !== "ACTIVE" || member.role !== "MEMBER") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Link href="/members" className="text-sm text-slate hover:text-ink">
        ← Members
      </Link>
      <div className="mt-8 flex items-start gap-5">
        <Avatar
          name={member.name}
          size={72}
          photoSrc={member.photoPath ? `/api/files/${member.photoPath}` : null}
        />
        <div>
          <h1 className="pt">{member.name}</h1>
          <p className="member-role mt-2">
            {[member.practiceArea, member.firm, member.city].filter(Boolean).join(" · ")}
          </p>
          {member.jurisdiction ? (
            <p className="mt-1 text-xs tracking-wide text-slate-lt uppercase">
              {member.jurisdiction}
            </p>
          ) : null}
        </div>
      </div>
      {member.bio ? <p className="mt-8 leading-relaxed text-slate">{member.bio}</p> : null}
      <p className="mt-8 text-sm text-slate-lt">
        Membership is personal. This profile is the same record the member edits
        in the private area.
      </p>
    </main>
  );
}
