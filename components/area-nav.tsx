"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AreaNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname() || "/area";
  const active = links
    .filter((link) =>
      link.href === "/area" ? pathname === "/area" : pathname === link.href || pathname.startsWith(`${link.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <nav className="subnav" aria-label="Members' area">
      {links.map((link) => {
        const on = active?.href === link.href;
        return (
          <Link key={link.href} href={link.href} className={on ? "on" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
