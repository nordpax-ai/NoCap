"use server";

import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { isPdf, MAX_CV_BYTES, saveUpload } from "@/lib/files";

export async function submitApplicationAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const firmAndCity = String(formData.get("firmAndCity") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const nominatedBy = String(formData.get("nominatedBy") || "").trim();
  const why = String(formData.get("why") || "").trim();
  const privacy = formData.get("privacy") === "on" || formData.get("privacy") === "true";
  const cv = formData.get("cv");

  if (!name || !firmAndCity || !email || !why) {
    return { error: "Please complete the required fields." };
  }
  if (!privacy) {
    return { error: "You must accept the privacy notice to submit." };
  }
  if (!(cv instanceof File) || cv.size === 0) {
    return { error: "Please attach a CV as a PDF of 5MB or less." };
  }
  if (!isPdf(cv)) return { error: "The CV must be a PDF." };
  if (cv.size > MAX_CV_BYTES) return { error: "The CV must be 5MB or less." };

  const saved = await saveUpload("applications", cv, MAX_CV_BYTES);
  await prisma.application.create({
    data: {
      name,
      firmAndCity,
      email,
      nominatedBy: nominatedBy || null,
      why,
      cvPath: saved.storagePath,
      cvFilename: saved.filename,
      privacyAccepted: true,
    },
  });

  const inbox = process.env.APPLICATIONS_INBOX || process.env.SECRETARY_EMAIL;
  if (inbox) {
    await sendMail({
      to: inbox,
      subject: `nocap — membership note from ${name}`,
      text: `${name}\n${firmAndCity}\n${email}\nNominated by: ${nominatedBy || "—"}\n\n${why}\n`,
    });
  } else {
    await sendMail({
      to: "applications@localhost",
      subject: `nocap — membership note from ${name} (stored locally; no inbox configured)`,
      text: `${name}\n${firmAndCity}\n${email}\nNominated by: ${nominatedBy || "—"}\n\n${why}\n`,
    });
  }

  return { ok: true };
}
