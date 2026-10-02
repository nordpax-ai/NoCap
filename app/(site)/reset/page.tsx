import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { requestReset } from "@/lib/actions";

export const metadata = { title: "Reset password" };

export default async function ResetRequestPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <div className="wrap inner">
      <div className="mb-form">
        <div className="eyebrow">Private area</div>
        <h1 className="pt">Reset your password</h1>
        {sent ? (
          <p className="note ok">If that address belongs to a member, a reset link is on its way.</p>
        ) : (
          <ActionForm action={requestReset}>
            <div className="fld">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
            <SubmitButton className="btn" dark>Send the link</SubmitButton>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
