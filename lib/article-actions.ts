"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "./auth";
import { pool } from "./db";
import { countWords, formatDay, getAssignment, memberCanEdit } from "./articles";
import { notifyMany } from "./notify";

function go(path: string, error?: string): never {
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}` : path);
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) || "").trim();
}

function day(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function saveArticle(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "assignment_id");
  const submit = text(formData, "intent") === "submit";
  const assignment = await getAssignment(id);
  if (!assignment || assignment.member_id !== user.id) go("/area/article", "That assignment is not yours.");
  if (!memberCanEdit(assignment.status)) go("/area/article", "This text is with the reviewers and cannot be edited now.");
  const title = text(formData, "title");
  const body = String(formData.get("body") || "").replace(/\r\n/g, "\n").trim();
  const words = countWords(body);
  if (submit && (!title || !body)) go("/area/article", "Add a title and the text before you submit.");
  await pool.query(
    `UPDATE article_assignments
     SET title = $2, body = $3, word_count = $4,
         status = $5, submitted_at = CASE WHEN $6 THEN now() ELSE submitted_at END, updated_at = now()
     WHERE id = $1`,
    [id, title || null, body || null, words, submit ? "submitted" : assignment.status === "changes_requested" ? "changes_requested" : "draft", submit],
  );
  if (submit) {
    const { rows: admins } = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM profiles WHERE role = 'admin' AND status = 'active'`,
    );
    const stamp = Date.now();
    await notifyMany(
      admins.map((admin) => ({
        recipientId: admin.id,
        email: admin.email,
        kind: "article_submitted",
        title: `Article submitted: ${user.display_name}`,
        body: `${user.display_name} submitted "${title}" (${words} words) for review. Publication date: ${formatDay(assignment.publication_date)}.`,
        href: `/area/admin/articles/${id}`,
        eventKey: `article:${id}:submitted:${stamp}:${admin.id}`,
      })),
    );
  }
  revalidatePath("/area/article");
  redirect(`/area/article?${submit ? "submitted" : "saved"}=1`);
}

export async function saveAssignment(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "assignment_id");
  const memberId = text(formData, "member_id");
  const month = Number(text(formData, "plan_month"));
  const theme = text(formData, "theme");
  const due = day(formData, "due_date");
  const publication = day(formData, "publication_date");
  const back = id ? `/area/admin/articles/${id}` : "/area/admin/articles";
  if (!memberId || !theme || !due || !publication || !Number.isInteger(month) || month < 1 || month > 24) {
    go(back, "Member, month, theme, due date and publication date are required.");
  }
  const values = [memberId, month, theme, text(formData, "format_notes") || null, text(formData, "guidance") || null, due, publication];
  if (id) {
    await pool.query(
      `UPDATE article_assignments SET member_id = $2, plan_month = $3, theme = $4, format_notes = $5,
         guidance = $6, due_date = $7, publication_date = $8, updated_at = now() WHERE id = $1`,
      [id, ...values],
    );
    revalidatePath(back);
    redirect(`${back}?saved=1`);
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO article_assignments (member_id, plan_month, theme, format_notes, guidance, due_date, publication_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [...values, admin.id],
  );
  const newId = rows[0].id;
  if (formData.get("notify") === "on") {
    const { rows: members } = await pool.query<{ email: string }>(
      `SELECT email FROM profiles WHERE id = $1 AND status = 'active'`,
      [memberId],
    );
    if (members[0]) {
      await notifyMany([
        {
          recipientId: memberId,
          email: members[0].email,
          kind: "article_assigned",
          title: "You have an article to write for nocap",
          body: `Theme: ${theme}. Text due ${formatDay(due!)}, publication ${formatDay(publication!)}. The brief and the editor are under "Your article".`,
          href: "/area/article",
          eventKey: `article:${newId}:assigned:${memberId}`,
        },
      ]);
    }
  }
  revalidatePath("/area/admin/articles");
  redirect(`/area/admin/articles/${newId}?created=1`);
}

export async function reviewArticle(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "assignment_id");
  const decision = text(formData, "decision");
  const comment = text(formData, "comment");
  const assignment = await getAssignment(id);
  if (!assignment) go("/area/admin/articles", "That assignment no longer exists.");
  const back = `/area/admin/articles/${id}`;
  if (decision === "approve") {
    if (assignment.status !== "submitted") go(back, "Only a submitted text can be approved.");
    await pool.query(
      `UPDATE article_assignments SET status = 'approved', approved_at = now(), updated_at = now() WHERE id = $1`,
      [id],
    );
    await notifyMany([
      {
        recipientId: assignment.member_id,
        email: assignment.member_email,
        kind: "article_approved",
        title: "Your article is approved",
        body: `"${assignment.title}" is approved for publication on ${formatDay(assignment.publication_date)}.`,
        href: "/area/article",
        eventKey: `article:${id}:approved:${assignment.member_id}`,
      },
    ]);
  } else {
    if (!comment) go(back, "Write the comment first.");
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO article_comments (assignment_id, author_id, body) VALUES ($1, $2, $3) RETURNING id`,
      [id, admin.id, comment],
    );
    await pool.query(
      `UPDATE article_assignments SET status = 'changes_requested', updated_at = now()
       WHERE id = $1 AND status <> 'approved'`,
      [id],
    );
    await notifyMany([
      {
        recipientId: assignment.member_id,
        email: assignment.member_email,
        kind: "article_changes",
        title: "Comments on your article",
        body: `${admin.display_name} commented on your article:\n\n${comment}`,
        href: "/area/article",
        eventKey: `article:${id}:comment:${rows[0].id}:${assignment.member_id}`,
      },
    ]);
  }
  revalidatePath(back);
  revalidatePath("/area/article");
  redirect(`${back}?reviewed=1`);
}
