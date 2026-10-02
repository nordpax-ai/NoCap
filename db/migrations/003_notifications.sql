-- In-app notifications, and a minimum vote length so both reminders can go out.
-- Additive: existing votes, members and files are left as they are.

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id),
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  href text NOT NULL,
  event_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE (recipient_id, event_key)
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created
  ON notifications (recipient_id, created_at DESC);

REVOKE ALL ON notifications FROM PUBLIC;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $notes$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON notifications TO nocap_app';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_all ON notifications';
    EXECUTE 'CREATE POLICY nocap_app_all ON notifications FOR ALL TO nocap_app USING (true) WITH CHECK (true)';
  END IF;
END
$notes$;

CREATE OR REPLACE FUNCTION private.open_vote(
  p_actor uuid,
  p_subject text,
  p_description text,
  p_deadline timestamptz,
  p_qc numeric,
  p_qd numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_actor AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only an active admin can open a vote';
  END IF;
  IF length(trim(p_subject)) = 0 OR length(trim(p_description)) = 0 THEN
    RAISE EXCEPTION 'a vote needs a subject and a description';
  END IF;
  IF p_deadline <= now() THEN
    RAISE EXCEPTION 'the deadline has to be in the future';
  END IF;
  IF p_deadline <= now() + interval '48 hours' THEN
    RAISE EXCEPTION 'A vote must stay open for longer than 48 hours, so both reminders can go out.';
  END IF;
  IF p_qc < 0 OR p_qc > 100 OR p_qd < 0 OR p_qd > 100 THEN
    RAISE EXCEPTION 'quorum must be between 0 and 100';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE status = 'active') THEN
    RAISE EXCEPTION 'there are no eligible voters';
  END IF;

  INSERT INTO votes (
    opened_by, subject, description, deadline,
    quorum_constitutive, quorum_deliberative,
    status, electorate_frozen
  ) VALUES (
    p_actor, trim(p_subject), trim(p_description), p_deadline,
    p_qc, p_qd,
    'open', true
  ) RETURNING id INTO new_id;

  PERFORM set_config('nocap.electorate_write', 'on', true);
  INSERT INTO vote_electorate (vote_id, profile_id)
  SELECT new_id, id FROM profiles WHERE status = 'active';
  PERFORM set_config('nocap.electorate_write', 'off', true);

  RETURN new_id;
END;
$$;
