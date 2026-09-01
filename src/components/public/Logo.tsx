import Link from "next/link";
import { classNames } from "@/lib/utils";

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={classNames(
        "inline-flex items-center gap-2.5 font-[family-name:var(--font-outfit)] tracking-tight text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,var(--coral),var(--coral-soft)_55%,var(--periw))] text-[0.65rem] font-semibold text-ink-deep"
      >
        n
      </span>
      <span className="text-[1.15rem] leading-none">nocap</span>
    </Link>
  );
}
