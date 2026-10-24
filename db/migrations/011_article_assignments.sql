-- Article assignments (Slot A, member voice) and admin review comments. Additive.
CREATE TABLE IF NOT EXISTS article_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles (id),
  slot text NOT NULL DEFAULT 'A' CHECK (slot IN ('A')),
  plan_month integer NOT NULL CHECK (plan_month BETWEEN 1 AND 24),
  theme text NOT NULL,
  format_notes text,
  guidance text,
  due_date date NOT NULL,
  publication_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'draft', 'submitted', 'changes_requested', 'approved')),
  title text,
  body text,
  word_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS article_assignments_member_idx ON article_assignments (member_id);

CREATE TABLE IF NOT EXISTS article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES article_assignments (id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS article_comments_assignment_idx ON article_comments (assignment_id, created_at);

REVOKE ALL ON article_assignments, article_comments FROM PUBLIC;
ALTER TABLE article_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON article_assignments, article_comments TO nocap_app';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_all ON article_assignments';
    EXECUTE 'CREATE POLICY nocap_app_all ON article_assignments FOR ALL TO nocap_app USING (true) WITH CHECK (true)';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_all ON article_comments';
    EXECUTE 'CREATE POLICY nocap_app_all ON article_comments FOR ALL TO nocap_app USING (true) WITH CHECK (true)';
  END IF;
END
$grants$;
