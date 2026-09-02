import type { Metadata } from "next";
import { resetPasswordAction } from "@/app/actions/auth";
import { PasswordSetForm } from "@/components/PasswordSetForm";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow">Private area</p>
      <h1 className="pt mt-4">Set a new password</h1>
      <PasswordSetForm action={resetPasswordAction} token={token || ""} />
    </main>
  );
}
