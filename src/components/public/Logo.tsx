import Link from "next/link";
import { classNames } from "@/lib/utils";

type Tone = "navy" | "cream";
type Size = "nav" | "home" | "footer";

export function Logo({
  href = "/",
  className,
  tone = "navy",
  size = "nav",
  decorative = false,
}: {
  href?: string;
  className?: string;
  tone?: Tone;
  size?: Size;
  decorative?: boolean;
}) {
  const src = tone === "cream" ? "/brand/nocap-cream.png" : "/brand/nocap-navy.png";
  const markClass = size === "home" ? "home-mark" : size === "footer" ? "footer-mark" : "nav-mark";
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={decorative ? "" : "nocap"} className={markClass} />
  );

  if (decorative) {
    return <span className={classNames("inline-flex", className)}>{img}</span>;
  }

  return (
    <Link href={href} className={classNames("inline-flex", className)} aria-label="nocap home">
      {img}
    </Link>
  );
}
