"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/email";
import { MAX_DOC_BYTES, saveUpload } from "@/lib/files";

export async function createQuestionAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const deadlineRaw = String(formData.get("deadline") || "");
  if (!title || !body) return { error: "Title and text are required." };

  const question = await prisma.question.create({
    data: {
      title,
      body,
      authorId: user.id,
      deadline: deadlineRaw ? new Date(deadlineRaw) : null,
    },
  });

  const files = formData.getAll("attachments");
  for (const file of files) {
    if (file instanceof File && file.size > 0) {
      const saved = await saveUpload("questions", file, MAX_DOC_BYTES);
      await prisma.questionAttachment.create({
        data: {
          questionId: question.id,
          filename: saved.filename,
          storagePath: saved.storagePath,
          uploadedById: user.id,
        },
      });
    }
  }

  const members = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { email: true },
  });
  await sendMail({
    to: members.map((m) => m.email),
    subject: `nocap — new question: ${title}`,
    text: `${user.name} opened a question.\n\n${title}\n\n${body}\n\n${appUrl(`/app/questions/${question.id}`)}\n`,
  });

  revalidatePath("/app/questions");
  redirect(`/app/questions/${question.id}`);
}

export async function commentQuestionAction(formData: FormData) {
  const user = await requireUser();
  const questionId = String(formData.get("questionId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!body) return { error: "Write a short reply." };

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { author: true, comments: { include: { author: true } } },
  });
  if (!question) return { error: "Question not found." };

  await prisma.questionComment.create({
    data: { questionId, authorId: user.id, body },
  });

  const emails = new Set<string>([question.author.email]);
  for (const c of question.comments) emails.add(c.author.email);
  emails.delete(user.email);
  if (emails.size > 0) {
    await sendMail({
      to: [...emails],
      subject: `nocap — reply on: ${question.title}`,
      text: `${user.name} replied.\n\n${body}\n\n${appUrl(`/app/questions/${question.id}`)}\n`,
    });
  }

  revalidatePath(`/app/questions/${questionId}`);
  return { ok: true };
}

export async function nudgeQuestionAction(formData: FormData) {
  const user = await requireUser();
  const questionId = String(formData.get("questionId") || "");
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { comments: { include: { author: true } } },
  });
  if (!question) return { error: "Question not found." };
  if (question.authorId !== user.id && user.role !== "ADMIN") {
    return { error: "Only the member who opened this question can send a nudge." };
  }

  const members = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { email: true },
  });
  await sendMail({
    to: members.map((m) => m.email),
    subject: `nocap — nudge on: ${question.title}`,
    text: `${user.name} is nudging the circle on this question.\n\n${appUrl(`/app/questions/${question.id}`)}\n`,
  });
  return { ok: true, message: "A nudge has been sent to members." };
}
