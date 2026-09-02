"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_DOC_BYTES, saveUpload } from "@/lib/files";

export async function uploadDocumentAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") || "").trim();
  const area = String(formData.get("area") || "");
  const file = formData.get("file");
  const documentId = String(formData.get("documentId") || "");

  if (area !== "OFFICIAL" && area !== "SHARED") return { error: "Unknown area." };
  if (area === "OFFICIAL" && user.role !== "ADMIN") {
    return { error: "Only the administrator can add to the official register." };
  }
  if (!(file instanceof File) || file.size === 0) return { error: "Please attach a file." };
  if (!title && !documentId) return { error: "Please give the document a title." };

  const saved = await saveUpload(area.toLowerCase(), file, MAX_DOC_BYTES);

  if (documentId) {
    const existing = await prisma.document.findUnique({
      where: { id: documentId },
      include: { versions: true },
    });
    if (!existing) return { error: "Document not found." };
    if (existing.area === "OFFICIAL" && user.role !== "ADMIN") {
      return { error: "Only the administrator can version official documents." };
    }
    const nextVersion = Math.max(...existing.versions.map((v) => v.version), 0) + 1;
    await prisma.documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        filename: saved.filename,
        storagePath: saved.storagePath,
        uploadedById: user.id,
      },
    });
    await prisma.document.update({
      where: { id: documentId },
      data: { updatedAt: new Date() },
    });
  } else {
    const doc = await prisma.document.create({
      data: { title, area, uploadedById: user.id },
    });
    await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        version: 1,
        filename: saved.filename,
        storagePath: saved.storagePath,
        uploadedById: user.id,
      },
    });
  }

  revalidatePath("/app/documents");
  return { ok: true };
}

export async function requireAdminForOfficial() {
  return requireAdmin();
}
