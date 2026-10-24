import { PasswordForm } from "@/components/password-form";

export const metadata = { title: "Choose a password" };

export default async function ResetTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  return (
    <PasswordForm token={token} purpose="reset" error={error} title="Choose a new password" />
  );
}
