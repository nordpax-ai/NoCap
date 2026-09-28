import { setPasswordFromToken } from "@/lib/actions";

export function PasswordForm({
  token,
  purpose,
  error,
  title,
}: {
  token: string;
  purpose: "invite" | "reset";
  error?: string;
  title: string;
}) {
  return (
    <div className="wrap inner">
      <div className="mb-form">
        <div className="eyebrow">Private area</div>
        <h1 className="pt">{title}</h1>
        <p className="mb-ask">Use at least 10 characters. You can open this page from the email on your phone.</p>
        {error ? <p className="note">{error}</p> : null}
        <form action={setPasswordFromToken}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="purpose" value={purpose} />
          <div className="fld">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
          </div>
          <button className="btn" type="submit">Save and enter</button>
        </form>
      </div>
    </div>
  );
}
