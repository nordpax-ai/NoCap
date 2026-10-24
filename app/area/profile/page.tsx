import { ProfileForm } from "@/components/profile-form";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { setEmailNotifications } from "@/lib/actions";
import { initials, requireUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; email?: string }> }) {
  const user = await requireUser();
  const { error, saved, email } = await searchParams;
  const { rows } = await pool.query<{ email_notifications: boolean }>(
    `SELECT email_notifications FROM profiles WHERE id = $1`,
    [user.id],
  );
  const emailOn = rows[0]?.email_notifications ?? true;
  return (
    <>
      <h1 className="page-title">Your profile</h1>
      <p className="help">
        This profile stays in the reserved area. The public members page uses its own example profiles, so saving here does not change it.
      </p>
      {saved ? <p className="banner">Profile saved.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="avatar-lg" style={{ marginBottom: 16 }}>
        {user.photo_key ? (
          <img src={`/api/photos/${user.id}?v=${encodeURIComponent(user.photo_key)}`} alt="" />
        ) : (
          initials(user.display_name)
        )}
      </div>
      <ProfileForm
        defaults={{
          display_name: user.display_name,
          public_role: user.public_role || "",
          bio: user.bio || "",
          city: user.city || "",
          jurisdiction: user.jurisdiction || "",
          firm: user.firm || "",
          practice_area: user.practice_area || "",
          contacts: user.contacts || "",
        }}
      />
      <section id="email" style={{ marginTop: 36 }}>
        <h2 className="page-title" style={{ fontSize: "1.4em" }}>Email</h2>
        {email ? <p className="banner">Email preference saved.</p> : null}
        <ActionForm action={setEmailNotifications} className="stack">
          <label className="choice-line">
            <input id="email_notifications" type="checkbox" name="email_notifications" value="on" defaultChecked={emailOn} />
            <span>Email me notifications</span>
          </label>
          <p className="help">The bell in the members&apos; area always shows them. Password reset emails are sent either way.</p>
          <SubmitButton className="btn">Save email preference</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}
