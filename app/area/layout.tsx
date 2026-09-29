import { headers } from "next/headers";
import { MembersShell } from "@/components/members-shell";
import { requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { formatShort } from "@/lib/time";
import { closeDueVotes } from "@/lib/votes";

export const metadata = { title: "Members' area" };

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await closeDueVotes();
  const pathname = (await headers()).get("x-pathname") || "/area";
  const { rows } = await pool.query<{
    id: string;
    title: string;
    href: string;
    created_at: Date;
    read_at: Date | null;
  }>(
    `SELECT id, title, href, created_at, read_at
     FROM notifications
     WHERE recipient_id = $1
     ORDER BY created_at DESC
     LIMIT 30`,
    [user.id],
  );
  return (
    <MembersShell
      user={user}
      pathname={pathname}
      unread={rows.filter((row) => !row.read_at).length}
      notifications={rows.map((row) => ({
        id: row.id,
        title: row.title,
        href: row.href,
        when: formatShort(row.created_at),
      }))}
    >
      {children}
    </MembersShell>
  );
}
