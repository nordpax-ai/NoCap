import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow">Private area</p>
      <h1 className="pt mt-4">Private area</h1>
      <p className="lede mt-3">Members only. There is no open registration.</p>
      <LoginForm action={loginAction} next={next || "/app"} />
      <p className="mt-6 text-sm text-slate">
        <Link href="/forgot-password" className="underline">
          Forgotten password
        </Link>
      </p>
    </main>
  );
}
