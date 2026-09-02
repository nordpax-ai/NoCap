"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  clearSession,
  createSession,
  hashPassword,
  randomToken,
  verifyPassword,
} from "@/lib/auth";
import { appUrl, sendMail } from "@/lib/email";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/app");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
    return { error: "Those details are not recognised, or the account is not active." };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "Those details are not recognised, or the account is not active." };
  }
  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/app");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return { error: "This invitation is not valid, or it has expired." };
  }
  if (invite.user.status === "DEACTIVATED") {
    return { error: "This membership is no longer active." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.userId },
      data: { passwordHash: await hashPassword(password), status: "ACTIVE" },
    }),
    prisma.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await createSession(invite.userId);
  redirect("/app");
}

export async function requestResetAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE") {
    const token = randomToken();
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    await sendMail({
      to: user.email,
      subject: "nocap — reset your password",
      text: `A password reset was requested for your nocap account.\n\nSet a new password:\n${appUrl(`/reset-password?token=${token}`)}\n\nThis link expires in 24 hours. If you did not ask for this, ignore the message.`,
    });
  }
  return {
    ok: true,
    message: "If that address belongs to an active member, a reset link has been sent.",
  };
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.user.status !== "ACTIVE") {
    return { error: "This reset link is not valid, or it has expired." };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await createSession(row.userId);
  redirect("/app");
}
