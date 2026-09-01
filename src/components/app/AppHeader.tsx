import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { initials } from "@/lib/utils";

const LINKS = [
  { href: "/app", label: "Home" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/documents", label: "Documents" },
  { href: "/app/questions", label: "Questions" },
  { href: "/app/votes", label: "Votes" },
];

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--rule)] bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/app" className="font-[family-name:var(--font-news)] text-lg tracking-tight">
          nocap
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-[var(--ink-2)] md:flex" aria-label="Private area">
          {LINKS.slice(1).map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[var(--ink)]">
              {l.label}
            </Link>
          ))}
          {user.role === "ADMIN" ? (
            <Link href="/app/admin" className="hover:text-[var(--ink)]">
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-[var(--ink-2)] sm:inline">{user.name}</span>
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--live-bg)] text-xs font-medium text-[var(--live)]"
          >
            {initials(user.name)}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="text-xs text-[var(--ink-3)] hover:text-[var(--ink)]">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-[var(--rule)] px-4 py-2 text-sm text-[var(--ink-2)] md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap">
            {l.label}
          </Link>
        ))}
        {user.role === "ADMIN" ? (
          <Link href="/app/admin" className="whitespace-nowrap">
            Admin
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
