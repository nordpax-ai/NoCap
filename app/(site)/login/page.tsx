import Link from "next/link";
import { login } from "@/lib/actions";

export const metadata = { title: "Private area" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="wrap inner">
      <div className="mb-form">
        <div className="eyebrow">Private area</div>
        <h1 className="pt">Sign in</h1>
        <p className="mb-ask">Members only. There is no open signup. If you have lost access, reset your password or write to the chair.</p>
        {error ? <p className="note">{error}</p> : null}
        <form action={login}>
          <div className="fld">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="fld">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn" type="submit">Enter</button>
        </form>
        <p className="file-note" style={{ marginTop: 18 }}>
          <Link href="/reset">Forgot your password?</Link>
        </p>
      </div>
    </div>
  );
}
