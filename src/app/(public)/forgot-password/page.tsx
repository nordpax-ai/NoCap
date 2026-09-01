import type { Metadata } from "next";
import { requestResetAction } from "@/app/actions/auth";
import { FlashForm } from "@/components/FlashForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-3xl">Reset your password</h1>
      <p className="mt-3 text-slate">
        If the address belongs to an active member, a reset link will be sent.
      </p>
      <FlashForm
        action={requestResetAction}
        className="mt-8 grid gap-4"
        success="If that address belongs to an active member, a reset link has been sent."
      >
        <label className="grid gap-1.5 text-sm">
          <span>Email</span>
          <input className="field" name="email" type="email" required autoComplete="email" />
        </label>
        <button type="submit" className="inline-flex w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-paper">
          Send reset link
        </button>
      </FlashForm>
    </main>
  );
}
