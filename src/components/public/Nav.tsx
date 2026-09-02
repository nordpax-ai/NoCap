"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { classNames } from "@/lib/utils";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/members", label: "Members" },
  { href: "/publications", label: "Publications" },
  { href: "/membership", label: "Membership" },
];

export function PublicNav({ ink = false }: { ink?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tone = ink ? "cream" : "navy";

  return (
    <header className="public-nav sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Logo tone={tone} size="nav" />
        <nav className="ml-auto hidden items-center gap-7 md:flex" aria-label="Public">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={classNames("nav-link pb-0.5", pathname === link.href && "is-active")}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/private" className="nav-cta ml-auto md:ml-6">
          <LockIcon />
          <span>Private area</span>
        </Link>
        <button
          type="button"
          className="menu-btn inline-flex h-10 w-10 items-center justify-center rounded-full border border-line md:hidden"
          aria-expanded={open}
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden className="block h-3.5 w-4 border-y-2 border-current" />
        </button>
      </div>
      {open ? (
        <nav className="border-t border-line px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={classNames("nav-link py-1", pathname === link.href && "is-active")}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
