import { pool } from "./db";
import { notifyMany } from "./notify";

export const WORDS_MIN = 400;
export const WORDS_MAX = 600;

export type ArticleStatus = "pending" | "draft" | "submitted" | "changes_requested" | "approved";

export type Assignment = {
  id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  slot: string;
  plan_month: number;
  theme: string;
  format_notes: string | null;
  guidance: string | null;
  due_date: string;
  publication_date: string;
  status: ArticleStatus;
  title: string | null;
  body: string | null;
  word_count: number;
  submitted_at: Date | null;
  approved_at: Date | null;
};

export type ArticleComment = { id: string; author_name: string | null; body: string; created_at: Date };

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  pending: "Not started",
  draft: "Draft",
  submitted: "Submitted for review",
  changes_requested: "Changes requested",
  approved: "Approved",
};

const SELECT = `
  SELECT a.id, a.member_id, p.display_name AS member_name, p.email AS member_email,
         a.slot, a.plan_month, a.theme, a.format_notes, a.guidance,
         to_char(a.due_date, 'YYYY-MM-DD') AS due_date,
         to_char(a.publication_date, 'YYYY-MM-DD') AS publication_date,
         a.status, a.title, a.body, a.word_count, a.submitted_at, a.approved_at
  FROM article_assignments a JOIN profiles p ON p.id = a.member_id`;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// A plain calendar date (YYYY-MM-DD) shown the same in every time zone.
export function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function memberCanEdit(status: ArticleStatus): boolean {
  return status === "pending" || status === "draft" || status === "changes_requested";
}

export async function assignmentsForMember(memberId: string): Promise<Assignment[]> {
  const { rows } = await pool.query<Assignment>(`${SELECT} WHERE a.member_id = $1 ORDER BY a.publication_date`, [memberId]);
  return rows;
}

export async function allAssignments(): Promise<Assignment[]> {
  const { rows } = await pool.query<Assignment>(`${SELECT} ORDER BY a.publication_date, p.display_name`);
  return rows;
}

export async function getAssignment(id: string): Promise<Assignment | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await pool.query<Assignment>(`${SELECT} WHERE a.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function commentsFor(assignmentId: string): Promise<ArticleComment[]> {
  const { rows } = await pool.query<ArticleComment>(
    `SELECT c.id, p.display_name AS author_name, c.body, c.created_at
     FROM article_comments c LEFT JOIN profiles p ON p.id = c.author_id
     WHERE c.assignment_id = $1 ORDER BY c.created_at`,
    [assignmentId],
  );
  return rows;
}

// Runs with the vote maintenance cron: one reminder per assignment, five days
// before the due date, while the text has not been submitted.
export async function sendArticleReminders(): Promise<void> {
  const { rows } = await pool.query<{ id: string; member_id: string; email: string; theme: string; due_date: string }>(
    `SELECT a.id, a.member_id, p.email, a.theme, to_char(a.due_date, 'YYYY-MM-DD') AS due_date
     FROM article_assignments a JOIN profiles p ON p.id = a.member_id
     WHERE a.status IN ('pending', 'draft', 'changes_requested')
       AND p.status = 'active'
       AND current_date >= a.due_date - 5`,
  );
  if (rows.length === 0) return;
  await notifyMany(
    rows.map((row) => ({
      recipientId: row.member_id,
      email: row.email,
      kind: "article_reminder",
      title: `Reminder: your article is due ${formatDay(row.due_date)}`,
      body: `Your article "${row.theme}" is due ${formatDay(row.due_date)}. Open it to finish and submit it for review.`,
      href: "/area/article",
      eventKey: `article:${row.id}:reminder:5d:${row.member_id}`,
    })),
  );
}
