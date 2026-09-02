"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isImage, MAX_DOC_BYTES, saveUpload } from "@/lib/files";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const firm = String(formData.get("firm") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const practiceArea = String(formData.get("practiceArea") || "").trim();
  const jurisdiction = String(formData.get("jurisdiction") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const contacts = String(formData.get("contacts") || "").trim();
  const photo = formData.get("photo");

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (!isImage(photo)) return { error: "Photo must be a PNG, JPEG or WebP image." };
    if (photo.size > MAX_DOC_BYTES) return { error: "Photo is too large." };
    const saved = await saveUpload("photos", photo, MAX_DOC_BYTES);
    photoPath = saved.storagePath;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firm: firm || null,
      city: city || null,
      practiceArea: practiceArea || null,
      jurisdiction: jurisdiction || null,
      bio: bio || null,
      contacts: contacts || null,
      ...(photoPath ? { photoPath } : {}),
    },
  });

  revalidatePath("/members");
  revalidatePath("/app/profile");
  return { ok: true };
}
