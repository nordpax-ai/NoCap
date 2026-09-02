import type { Metadata } from "next";
import { acceptInviteAction } from "@/app/actions/auth";
import { PasswordSetForm } from "@/components/PasswordSetForm";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow">Invitation</p>
      <h1 className="pt mt-4">Set your password</h1>
      <p className="lede mt-3">
        You were invited. Choose a password to enter the private area.
      </p>
      <PasswordSetForm action={acceptInviteAction} token={token || ""} />
    </main>
  );
}
