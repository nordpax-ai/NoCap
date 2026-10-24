"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/members", label: "Members" },
  { href: "/publications", label: "Publications" },
];

export function PublicNav() {
  const pathname = usePathname() || "/";
  return (
    <ul className="nav-links">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <li key={link.href}>
            <Link href={link.href} className={active ? "active" : undefined}>
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
