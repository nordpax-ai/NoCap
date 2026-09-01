"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/email";
import { MAX_DOC_BYTES, saveUpload } from "@/lib/files";
import { ensureVoteClosed } from "@/lib/close-votes";
import type { VoteChoice } from "@/lib/votes";

const CHOICES: VoteChoice[] = ["FOR", "AGAINST", "ABSTAIN"];

export async function openVoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const object = String(formData.get("object") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const deadlineRaw = String(formData.get("deadline") || "");
  const constitutive = Number(formData.get("constitutivePercent"));
  const deliberative = Number(formData.get("deliberativePercent"));

  if (!object || !description) return { error: "Object and description are required." };
  if (!deadlineRaw) return { error: "A deadline is mandatory." };
  const deadline = new Date(deadlineRaw);
  if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
    return { error: "Deadline must be a future date and time." };
  }
  if (
    !Number.isFinite(constitutive) ||
    !Number.isFinite(deliberative) ||
    constitutive < 0 ||
    constitutive > 100 ||
    deliberative < 0 ||
    deliberative > 100
  ) {
    return { error: "Quorums must be percentages between 0 and 100." };
  }

  const eligible = await prisma.user.findMany({
    where: { status: "ACTIVE" },
  });

  const vote = await prisma.vote.create({
    data: {
      object,
      description,
      deadline,
      constitutivePercent: Math.round(constitutive),
      deliberativePercent: Math.round(deliberative),
      openedById: admin.id,
    },
  });

  await prisma.voteEligible.createMany({
    data: eligible.map((u) => ({
      voteId: vote.id,
      userId: u.id,
      nameSnapshot: u.name,
    })),
  });

  const files = formData.getAll("attachments");
  for (const file of files) {
    if (file instanceof File && file.size > 0) {
      const saved = await saveUpload("votes", file, MAX_DOC_BYTES);
      await prisma.voteAttachment.create({
        data: {
          voteId: vote.id,
          filename: saved.filename,
          storagePath: saved.storagePath,
          uploadedById: admin.id,
        },
      });
    }
  }

  await sendMail({
    to: eligible.map((u) => u.email),
    subject: `nocap — a vote is open: ${object}`,
    text: `A vote has been opened.\n\n${object}\n\n${description}\n\nDeadline: ${deadline.toISOString()}\n\n${appUrl(`/app/votes/${vote.id}`)}\n`,
  });

  revalidatePath("/app/votes");
  redirect(`/app/votes/${vote.id}`);
}

export async function castBallotAction(formData: FormData) {
  const user = await requireUser();
  const voteId = String(formData.get("voteId") || "");
  const choice = String(formData.get("choice") || "") as VoteChoice;
  if (!CHOICES.includes(choice)) return { error: "Choose For, Against or Abstain." };

  const vote = await ensureVoteClosed(voteId);
  if (!vote) return { error: "Vote not found." };
  if (vote.closedAt || vote.deadline.getTime() <= Date.now()) {
    return { error: "This vote is closed. Ballots cannot be changed or added." };
  }

  const eligible = await prisma.voteEligible.findUnique({
    where: { voteId_userId: { voteId, userId: user.id } },
  });
  if (!eligible) return { error: "You were not on the eligible list when this vote opened." };

  const existing = await prisma.ballot.findUnique({
    where: { voteId_userId: { voteId, userId: user.id } },
  });
  if (existing) return { error: "You have already voted. A vote cannot be changed." };

  await prisma.ballot.create({
    data: { voteId, userId: user.id, choice },
  });

  revalidatePath(`/app/votes/${voteId}`);
  revalidatePath("/app/votes");
  return { ok: true };
}

export async function remindNonVotersAction(formData: FormData) {
  const admin = await requireAdmin();
  const voteId = String(formData.get("voteId") || "");
  const vote = await ensureVoteClosed(voteId);
  if (!vote) return { error: "Vote not found." };
  if (vote.closedAt) return { error: "This vote is closed." };

  const eligible = await prisma.voteEligible.findMany({
    where: { voteId },
    include: { user: true },
  });
  const ballots = await prisma.ballot.findMany({ where: { voteId } });
  const voted = new Set(ballots.map((b) => b.userId));
  const pending = eligible.filter((e) => !voted.has(e.userId) && e.user.status === "ACTIVE");
  if (pending.length === 0) return { ok: true, message: "Everyone eligible has voted." };

  await sendMail({
    to: pending.map((p) => p.user.email),
    subject: `nocap — reminder: ${vote.object}`,
    text: `You have not yet voted.\n\n${vote.object}\nDeadline: ${vote.deadline.toISOString()}\n\n${appUrl(`/app/votes/${vote.id}`)}\n\nSent by ${admin.name}.\n`,
  });
  return { ok: true, message: `Reminder sent to ${pending.length} member${pending.length === 1 ? "" : "s"} who have not voted.` };
}
