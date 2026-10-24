import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { registerMember } from "@/lib/actions";
import { registrationState } from "@/lib/registration";

export const metadata = { title: "Register" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const state = await registrationState();
  return (
    <div className="wrap inner">
      <div className="mb-form">
        <div className="eyebrow">Private area</div>
        <h1 className="pt">Register</h1>
        {!state.open ? (
          <>
            <p className="note">Registration is closed. Ask an admin for an invite.</p>
            <p className="file-note" style={{ marginTop: 18 }}>
              Already a member? <Link href="/login">Sign in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="mb-ask">For founding members of NoCap. Register with your name, email and a password.</p>
            {error ? <p className="note">{error}</p> : null}
            <ActionForm action={registerMember}>
              <div className="fld">
                <label htmlFor="name">Full name</label>
                <input id="name" name="name" autoComplete="name" required />
              </div>
              <div className="fld">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="fld">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
              </div>
              <SubmitButton className="btn" dark>Register and enter</SubmitButton>
            </ActionForm>
            <p className="file-note" style={{ marginTop: 18 }}>
              Already a member? <Link href="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
