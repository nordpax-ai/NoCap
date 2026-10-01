import { ProfileForm } from "@/components/profile-form";
import { initials, requireUser } from "@/lib/auth";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requireUser();
  const { error, saved } = await searchParams;
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
    </>
  );
}
