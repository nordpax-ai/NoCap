import Link from "next/link";
import { env } from "@/lib/env";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/members", label: "Members" },
  { href: "/publications", label: "Publications" },
  { href: "/membership", label: "Membership" },
];

function Lock() {
  return (
    <svg className="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="11" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

export function PublicShell({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const dark = pathname === "/about";
  const contact = env.contactEmail();
  return (
    <div className={dark ? "pub tone-dark" : "pub"}>
      <nav className="nav">
        <div className="wrap">
          <Link href="/" aria-label="nocap home">
            <img className="nav-mark navy" src="/brand/mark-navy.png" alt="nocap" />
            <img className="nav-mark cream" src="/brand/mark-cream.png" alt="" />
          </Link>
          <ul className="nav-links">
            {LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link href={link.href} className={active ? "active" : undefined}>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link className="nav-priv" href="/login">
            <Lock />
            <span>Private area</span>
          </Link>
        </div>
      </nav>
      <main>{children}</main>
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div>
              <img className="foot-mark" src="/brand/mark-cream.png" alt="nocap" />
              <div className="foot-tag">NextGen European Deal Lawyers</div>
            </div>
            <div className="foot-links">
              <Link href="/about">About</Link>
              <Link href="/members">Members</Link>
              <Link href="/publications">Publications</Link>
              <Link href="/membership">Membership</Link>
              <a href={`mailto:${contact}`}>Contact</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>A private association of individuals. Not a network of law firms.</span>
            <span>© {new Date().getFullYear()} nocap</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
