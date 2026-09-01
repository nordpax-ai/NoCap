import { AppHeader } from "@/components/app/AppHeader";
import { requireUser } from "@/lib/auth";

export default async function CircleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="circle flex min-h-full flex-col bg-[var(--paper)] text-[var(--ink)]">
      <AppHeader user={user} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</div>
    </div>
  );
}
