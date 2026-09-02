import { updateProfileAction } from "@/app/actions/profile";
import { FlashForm } from "@/components/FlashForm";
import { Avatar } from "@/components/Avatar";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });

  return (
    <main>
      <p className="text-xs tracking-[0.16em] text-[var(--ink-3)] uppercase">Profile</p>
      <h1 className="mt-2 text-4xl">Your public face</h1>
      <p className="mt-3 max-w-xl text-[var(--ink-2)]">
        What you save here is what appears on the public Members page. If you
        leave, this profile is deactivated and disappears from public view.
      </p>

      <div className="mt-8 flex items-center gap-4">
        <Avatar
          name={user.name}
          size={64}
          photoSrc={user.photoPath ? `/api/files/${user.photoPath}` : null}
        />
        <div>
          <p className="text-lg">{user.name}</p>
          <p className="text-sm text-[var(--ink-3)]">{user.email}</p>
        </div>
      </div>

      <FlashForm action={updateProfileAction} className="mt-8 grid max-w-xl gap-4" success="Profile saved.">
        <label className="grid gap-1.5 text-sm">
          <span>Photo</span>
          <input className="field" type="file" name="photo" accept="image/png,image/jpeg,image/webp" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Firm</span>
          <input className="field" name="firm" defaultValue={user.firm ?? ""} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>City</span>
          <input className="field" name="city" defaultValue={user.city ?? ""} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Practice area</span>
          <input className="field" name="practiceArea" defaultValue={user.practiceArea ?? ""} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Jurisdiction</span>
          <input className="field" name="jurisdiction" defaultValue={user.jurisdiction ?? ""} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Contacts</span>
          <input className="field" name="contacts" defaultValue={user.contacts ?? ""} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span>Short bio</span>
          <textarea className="field min-h-28" name="bio" defaultValue={user.bio ?? ""} />
        </label>
        <button type="submit" className="inline-flex w-fit rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm text-[var(--paper)]">
          Save profile
        </button>
      </FlashForm>
    </main>
  );
}
