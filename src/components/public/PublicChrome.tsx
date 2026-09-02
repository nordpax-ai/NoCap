"use client";

import { usePathname } from "next/navigation";
import { PublicFooter } from "./Footer";
import { PublicNav } from "./Nav";
import { classNames } from "@/lib/utils";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ink = pathname === "/about";

  return (
    <div className={classNames("public flex min-h-full flex-col", ink && "public-ink")}>
      <PublicNav ink={ink} />
      <div className="flex-1">{children}</div>
      <PublicFooter ink={ink} />
    </div>
  );
}
