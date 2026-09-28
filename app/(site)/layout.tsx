import { headers } from "next/headers";
import { PublicShell } from "@/components/public-shell";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") || "/";
  return <PublicShell pathname={pathname}>{children}</PublicShell>;
}
