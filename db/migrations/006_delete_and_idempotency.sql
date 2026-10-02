-- Delete an open vote or a question, and remember a create so a double submit
-- does not insert a second row. Additive. Closed votes stay undeletable.

CREATE TABLE IF NOT EXISTS create_guards (
  actor_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  action text NOT NULL,
  fingerprint text NOT NULL,
  token uuid,
  resource_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, action, fingerprint)
);

CREATE UNIQUE INDEX IF NOT EXISTS create_guards_token_idx
  ON create_guards (token) WHERE token IS NOT NULL;

REVOKE ALL ON create_guards FROM PUBLIC;
ALTER TABLE create_guards ENABLE ROW LEVEL SECURITY;

-- The opener can disappear. An open vote then belongs to any admin.
ALTER TABLE votes ALTER COLUMN opened_by DROP NOT NULL;

DO $fk$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'votes'::regclass
      AND con.contype = 'f'
      AND pg_get_constraintdef(con.oid) ILIKE '%opened_by%'
  LOOP
    EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END
$fk$;

ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_opened_by_fkey;
ALTER TABLE votes
  ADD CONSTRAINT votes_opened_by_fkey
  FOREIGN KEY (opened_by) REFERENCES profiles (id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION private.guard_vote() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('nocap.deleting_open', true) = 'on' AND OLD.status = 'open' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'votes cannot be deleted';
  END IF;
  IF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'closed votes cannot be modified';
  END IF;
  IF OLD.electorate_frozen AND current_setting('nocap.closing_vote', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'an open vote cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_electorate() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('nocap.deleting_open', true) = 'on'
     AND EXISTS (SELECT 1 FROM votes WHERE id = OLD.vote_id AND status = 'open') THEN
    RETURN OLD;
  END IF;
  IF current_setting('nocap.electorate_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'the electorate is frozen when a vote opens';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_ballot() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    IF TG_OP = 'DELETE'
       AND current_setting('nocap.deleting_open', true) = 'on'
       AND EXISTS (SELECT 1 FROM votes WHERE id = OLD.vote_id AND status = 'open') THEN
      RETURN OLD;
    END IF;
    IF current_user = 'nocap_owner' AND current_setting('nocap.seed_ballot', true) = 'on' THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'a vote cannot be changed or deleted once cast';
  END IF;
  SELECT * INTO v FROM votes WHERE id = NEW.vote_id;
  IF v.status <> 'open' OR v.deadline <= now() THEN
    RAISE EXCEPTION 'this vote is not open';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_vote_option() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('nocap.deleting_open', true) = 'on'
     AND EXISTS (SELECT 1 FROM votes WHERE id = OLD.vote_id AND status = 'open') THEN
    RETURN OLD;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'poll options cannot be changed once the poll is open';
  END IF;
  IF current_setting('nocap.option_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'poll options are set when the poll opens';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_poll_ballot() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    IF TG_OP = 'DELETE'
       AND current_setting('nocap.deleting_open', true) = 'on'
       AND EXISTS (SELECT 1 FROM votes WHERE id = OLD.vote_id AND status = 'open') THEN
      RETURN OLD;
    END IF;
    IF current_user = 'nocap_owner' AND current_setting('nocap.seed_ballot', true) = 'on' THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'a vote cannot be changed or deleted once cast';
  END IF;
  IF current_setting('nocap.poll_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'a poll answer is cast through the vote';
  END IF;
  SELECT * INTO v FROM votes WHERE id = NEW.vote_id;
  IF v.kind IS DISTINCT FROM 'poll' OR v.status <> 'open' OR v.deadline <= now() THEN
    RAISE EXCEPTION 'this vote is not open';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_poll_answer() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('nocap.deleting_open', true) = 'on'
     AND EXISTS (SELECT 1 FROM votes WHERE id = OLD.vote_id AND status = 'open') THEN
    RETURN OLD;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'a vote cannot be changed or deleted once cast';
  END IF;
  IF current_setting('nocap.poll_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'a poll answer is cast through the vote';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM vote_options WHERE id = NEW.option_id AND vote_id = NEW.vote_id
  ) THEN
    RAISE EXCEPTION 'that option is not on this poll';
  END IF;
  SELECT * INTO v FROM votes WHERE id = NEW.vote_id;
  IF v.kind IS DISTINCT FROM 'poll' OR v.status <> 'open' OR v.deadline <= now() THEN
    RAISE EXCEPTION 'this vote is not open';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.delete_open_vote(p_actor uuid, p_vote_id uuid) RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
  keys text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_actor AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only an active admin can delete a vote';
  END IF;
  SELECT * INTO v FROM votes WHERE id = p_vote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That vote has already been deleted.';
  END IF;
  IF v.status <> 'open' THEN
    RAISE EXCEPTION 'A closed vote cannot be deleted.';
  END IF;
  IF v.opened_by IS NOT NULL
     AND v.opened_by IS DISTINCT FROM p_actor
     AND EXISTS (SELECT 1 FROM profiles WHERE id = v.opened_by) THEN
    RAISE EXCEPTION 'Only the admin who opened this vote can delete it.';
  END IF;

  SELECT coalesce(array_agg(storage_key), '{}') INTO keys
  FROM attachments
  WHERE parent_type = 'vote' AND parent_id = p_vote_id;

  PERFORM set_config('nocap.deleting_open', 'on', true);
  DELETE FROM notifications
  WHERE event_key LIKE 'vote:' || p_vote_id::text || ':%'
     OR href = '/area/votes/' || p_vote_id::text;
  DELETE FROM attachments WHERE parent_type = 'vote' AND parent_id = p_vote_id;
  DELETE FROM poll_answers WHERE vote_id = p_vote_id;
  DELETE FROM poll_ballots WHERE vote_id = p_vote_id;
  DELETE FROM ballots WHERE vote_id = p_vote_id;
  DELETE FROM vote_options WHERE vote_id = p_vote_id;
  DELETE FROM vote_electorate WHERE vote_id = p_vote_id;
  DELETE FROM create_guards WHERE resource_id = p_vote_id;
  DELETE FROM votes WHERE id = p_vote_id;
  PERFORM set_config('nocap.deleting_open', 'off', true);
  RETURN keys;
END;
$$;

CREATE OR REPLACE FUNCTION private.delete_question(p_actor uuid, p_question_id uuid) RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  keys text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_actor AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only an active member can delete a question';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = p_question_id) THEN
    RAISE EXCEPTION 'That question has already been deleted.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = p_question_id AND author_id = p_actor) THEN
    RAISE EXCEPTION 'Only the member who asked this question can delete it.';
  END IF;

  SELECT coalesce(array_agg(storage_key), '{}') INTO keys
  FROM attachments
  WHERE (parent_type = 'question' AND parent_id = p_question_id)
     OR (parent_type = 'comment' AND parent_id IN (
          SELECT id FROM question_comments WHERE question_id = p_question_id
        ));

  DELETE FROM notifications
  WHERE event_key LIKE 'question:' || p_question_id::text || ':%'
     OR href = '/area/questions/' || p_question_id::text;
  DELETE FROM attachments
  WHERE (parent_type = 'question' AND parent_id = p_question_id)
     OR (parent_type = 'comment' AND parent_id IN (
          SELECT id FROM question_comments WHERE question_id = p_question_id
        ));
  DELETE FROM question_comments WHERE question_id = p_question_id;
  DELETE FROM create_guards WHERE resource_id = p_question_id;
  DELETE FROM questions WHERE id = p_question_id;
  RETURN keys;
END;
$$;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON create_guards TO nocap_app';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_all ON create_guards';
    EXECUTE 'CREATE POLICY nocap_app_all ON create_guards FOR ALL TO nocap_app USING (true) WITH CHECK (true)';
    EXECUTE 'GRANT EXECUTE ON FUNCTION private.delete_open_vote(uuid, uuid), private.delete_question(uuid, uuid) TO nocap_app';
  END IF;
END
$grants$;
