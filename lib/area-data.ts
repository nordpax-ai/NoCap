import { pool } from "./db";

export type AreaNote = {
  id: string;
  title: string;
  href: string;
  created_at: string;
  read_at: string | null;
};

export type AreaFrameRow = {
  id: string;
  email: string;
  role: "admin" | "member";
  status: "invited" | "active" | "deactivated";
  display_name: string;
  firm: string | null;
  city: string | null;
  practice_area: string | null;
  contacts: string | null;
  public_role: string | null;
  bio: string | null;
  jurisdiction: string | null;
  photo_key: string | null;
  is_example: boolean;
  notes: AreaNote[] | null;
  needs_maintenance: boolean;
};

export async function fetchAreaFrame(tokenHash: string): Promise<AreaFrameRow | null> {
  const { rows } = await pool.query<AreaFrameRow>(
    `SELECT p.id, p.email, p.role, p.status, p.display_name, p.firm, p.city,
            p.practice_area, p.contacts, p.public_role, p.bio, p.jurisdiction,
            p.photo_key, p.is_example,
            COALESCE(n.notes, '[]'::json) AS notes,
            EXISTS (
              SELECT 1 FROM votes v
              WHERE v.status = 'open' AND v.deadline <= now() + interval '48 hours'
            ) AS needs_maintenance
     FROM sessions s
     JOIN profiles p ON p.id = s.profile_id
     LEFT JOIN LATERAL (
       SELECT json_agg(
                json_build_object(
                  'id', x.id, 'title', x.title, 'href', x.href,
                  'created_at', x.created_at, 'read_at', x.read_at
                )
                ORDER BY x.created_at DESC
              ) AS notes
       FROM (
         SELECT id, title, href, created_at, read_at
         FROM notifications
         WHERE recipient_id = p.id
         ORDER BY created_at DESC
         LIMIT 30
       ) x
     ) n ON true
     WHERE s.token_hash = $1 AND s.expires_at > now() AND p.status = 'active'`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export type DashboardDoc = { category: string; title: string; versions: number; uploaded_at: string };
export type DashboardQuestion = {
  id: string;
  title: string;
  created_at: string;
  deadline: string | null;
  author: string;
  replies: number;
};
export type DashboardVote = {
  id: string;
  subject: string;
  status: string;
  deadline: string;
  opened_at: string;
  outcome: string | null;
  for_count: number | null;
  against_count: number | null;
  abstain_count: number | null;
  author: string;
  ballots: number;
  eligible: number;
  kind: string;
  poll_summary: string | null;
};

export async function fetchDashboard(): Promise<{
  register: DashboardDoc[];
  questions: DashboardQuestion[];
  votes: DashboardVote[];
  minutes: number;
  resolutions: number;
}> {
  const { rows } = await pool.query<{
    register: DashboardDoc[] | null;
    questions: DashboardQuestion[] | null;
    votes: DashboardVote[] | null;
    minutes: number;
    resolutions: number;
  }>(
    `SELECT
       COALESCE((
         SELECT json_agg(json_build_object(
                  'category', d.category, 'title', d.title,
                  'versions', d.versions, 'uploaded_at', d.uploaded_at
                ) ORDER BY d.title)
         FROM (
           SELECT d.category, d.title, count(v.id)::int AS versions, max(v.uploaded_at) AS uploaded_at
           FROM documents d
           JOIN document_versions v ON v.document_id = d.id
           WHERE d.area = 'register' AND d.category IN ('charter', 'code_of_conduct')
           GROUP BY d.id
         ) d
       ), '[]'::json) AS register,
       (SELECT count(*)::int FROM documents WHERE area = 'register' AND category = 'minutes') AS minutes,
       (
         (SELECT count(*)::int FROM documents WHERE category = 'resolution')
         + (SELECT count(*)::int FROM votes WHERE status = 'closed' AND kind = 'standard')
       ) AS resolutions,
       COALESCE((
         SELECT json_agg(json_build_object(
                  'id', q.id, 'title', q.title, 'created_at', q.created_at,
                  'deadline', q.deadline, 'author', q.author, 'replies', q.replies
                ) ORDER BY q.created_at DESC)
         FROM (
           SELECT q.id, q.title, q.created_at, q.deadline, p.display_name AS author,
                  (SELECT count(*)::int FROM question_comments c WHERE c.question_id = q.id) AS replies
           FROM questions q
           JOIN profiles p ON p.id = q.author_id
           WHERE q.deadline IS NULL OR q.deadline > now()
         ) q
       ), '[]'::json) AS questions,
       COALESCE((
         SELECT json_agg(json_build_object(
                  'id', v.id, 'subject', v.subject, 'status', v.status, 'deadline', v.deadline,
                  'opened_at', v.opened_at, 'outcome', v.outcome, 'for_count', v.for_count,
                  'against_count', v.against_count, 'abstain_count', v.abstain_count,
                  'author', v.author, 'ballots', v.ballots, 'eligible', v.eligible,
                  'kind', v.kind, 'poll_summary', v.poll_summary
                ) ORDER BY (v.status = 'open') DESC, v.opened_at DESC)
         FROM (
           SELECT v.id, v.subject, v.status, v.deadline, v.opened_at, v.outcome,
                  v.for_count, v.against_count, v.abstain_count, COALESCE(p.display_name, 'Former member') AS author, v.kind,
                  (SELECT count(*)::int FROM ballots b WHERE b.vote_id = v.id)
                    + (SELECT count(*)::int FROM poll_ballots pb WHERE pb.vote_id = v.id) AS ballots,
                  (SELECT count(*)::int FROM vote_electorate e WHERE e.vote_id = v.id) AS eligible,
                  (
                    SELECT string_agg(
                      o.label || ' ' || (SELECT count(*)::int FROM poll_answers a WHERE a.option_id = o.id)::text,
                      ', ' ORDER BY o.position
                    )
                    FROM vote_options o
                    WHERE o.vote_id = v.id
                  ) AS poll_summary
           FROM votes v
           LEFT JOIN profiles p ON p.id = v.opened_by
           ORDER BY (v.status = 'open') DESC, v.opened_at DESC
           LIMIT 6
         ) v
       ), '[]'::json) AS votes`,
  );
  const row = rows[0];
  return {
    register: row?.register ?? [],
    questions: row?.questions ?? [],
    votes: row?.votes ?? [],
    minutes: row?.minutes ?? 0,
    resolutions: row?.resolutions ?? 0,
  };
}
