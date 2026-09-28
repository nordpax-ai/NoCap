import { headers } from "next/headers";
import { MembersShell } from "@/components/members-shell";
import { requireUser } from "@/lib/auth";
import { closeDueVotes } from "@/lib/votes";

export const metadata = { title: "Members' area" };

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await closeDueVotes();
  const pathname = (await headers()).get("x-pathname") || "/area";
  return (
    <MembersShell user={user} pathname={pathname}>
      {children}
    </MembersShell>
  );
}
