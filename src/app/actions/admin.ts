"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/auth";
import { appUrl, sendMail } from "@/lib/email";
import { slugify } from "@/lib/utils";

export async function inviteMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!name || !email) return { error: "Name and email are required." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A member with that email already exists." };

  let slug = slugify(name);
  const clash = await prisma.user.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: "MEMBER",
      status: "INVITED",
      slug,
    },
  });
  const token = randomToken();
  await prisma.inviteToken.create({
    data: {
      token,
      userId: user.id,
      invitedById: admin.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
  });

  await sendMail({
    to: email,
    subject: "nocap — your invitation",
    text: `${admin.name} has invited you to nocap.\n\nSet your password and enter the private area:\n${appUrl(`/invite?token=${token}`)}\n\nThis link expires in 14 days. There is no open registration.\n`,
  });

  revalidatePath("/app/admin");
  return { ok: true, message: `Invitation sent to ${email}.` };
}

export async function deactivateMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  if (userId === admin.id) return { error: "You cannot deactivate your own admin account here." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Member not found." };

  await prisma.user.update({
    where: { id: userId },
    data: { status: "DEACTIVATED", deactivatedAt: new Date() },
  });

  revalidatePath("/members");
  revalidatePath("/app/admin");
  return { ok: true };
}
