"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>nocap — a private European circle. Invitation only.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/private" className="hover:text-ink">
            Private area
          </Link>
        </div>
      </div>
    </footer>
  );
}
