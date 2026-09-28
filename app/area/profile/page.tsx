import { updateProfile } from "@/lib/actions";
import { initials, requireUser } from "@/lib/auth";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requireUser();
  const { error, saved } = await searchParams;
  return (
    <>
      <h1 className="page-title">Your profile</h1>
      <p className="help">
        Photo, role, short biography, city and jurisdiction are shown on the public members page while you are active. Firm, practice area and contacts stay in the reserved area.
      </p>
      {saved ? <p className="banner">Saved.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="avatar-lg" style={{ marginBottom: 16 }}>
        {user.photo_key ? <img src={`/api/photos/${user.id}`} alt="" /> : initials(user.display_name)}
      </div>
      <form action={updateProfile} className="stack">
        <div>
          <label className="lbl" htmlFor="display_name">Name</label>
          <input id="display_name" name="display_name" defaultValue={user.display_name} required />
        </div>
        <div>
          <label className="lbl" htmlFor="public_role">Role on the public page</label>
          <input id="public_role" name="public_role" defaultValue={user.public_role || ""} placeholder="Senior associate · M&A" />
        </div>
        <div>
          <label className="lbl" htmlFor="bio">Short biography</label>
          <textarea id="bio" name="bio" defaultValue={user.bio || ""} />
        </div>
        <div>
          <label className="lbl" htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={user.city || ""} />
        </div>
        <div>
          <label className="lbl" htmlFor="jurisdiction">Jurisdiction</label>
          <input id="jurisdiction" name="jurisdiction" defaultValue={user.jurisdiction || ""} />
        </div>
        <div>
          <label className="lbl" htmlFor="firm">Firm</label>
          <input id="firm" name="firm" defaultValue={user.firm || ""} />
        </div>
        <div>
          <label className="lbl" htmlFor="practice_area">Practice area</label>
          <input id="practice_area" name="practice_area" defaultValue={user.practice_area || ""} />
        </div>
        <div>
          <label className="lbl" htmlFor="contacts">Contacts</label>
          <input id="contacts" name="contacts" defaultValue={user.contacts || ""} />
        </div>
        <div>
          <label className="lbl" htmlFor="photo">Photo</label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
        <button className="btn solid" type="submit">Save profile</button>
      </form>
    </>
  );
}
