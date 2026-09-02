"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

export function PublicFooter({ ink = false }: { ink?: boolean }) {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="public-footer mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Logo tone={ink ? "cream" : "navy"} size="footer" />
          <p>nocap — a private European circle. Invitation only.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="hover:opacity-100 opacity-80">
            Privacy
          </Link>
          <Link href="/private" className="hover:opacity-100 opacity-80">
            Private area
          </Link>
        </div>
      </div>
    </footer>
  );
}
