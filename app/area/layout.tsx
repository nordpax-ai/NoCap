import { headers } from "next/headers";
import { MembersShell } from "@/components/members-shell";
import { loadAreaFrame } from "@/lib/auth";
import { isNextControlFlow, logServerError } from "@/lib/log";
import { runVoteMaintenance } from "@/lib/votes";
import { redirect } from "next/navigation";

export const metadata = { title: "Members' area" };

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  try {
    const frame = await loadAreaFrame();
    if (!frame) redirect("/login");
    if (frame.needsMaintenance) {
      await runVoteMaintenance().catch((error) => {
        logServerError("vote-maintenance", error);
      });
    }
    const pathname = (await headers()).get("x-pathname") || "/area";
    return (
      <MembersShell
        user={frame.user}
        pathname={pathname}
        unread={frame.unread}
        notifications={frame.notifications}
      >
        {children}
      </MembersShell>
    );
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    logServerError("area-layout", error);
    throw error;
  }
}
