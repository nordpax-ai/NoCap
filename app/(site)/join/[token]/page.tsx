import { PasswordForm } from "@/components/password-form";

export const metadata = { title: "Set your password" };

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  return <PasswordForm token={token} purpose="invite" error={error} title="Set your password" />;
}
