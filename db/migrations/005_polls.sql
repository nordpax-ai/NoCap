-- Polls: a vote with custom options, beside For / Against / Abstain.
-- Additive. Existing votes stay kind 'standard' and keep both quorums.
-- A poll uses the constitutive quorum only. It does not write a resolutions row.

ALTER TABLE votes ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'standard';
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_kind_check;
ALTER TABLE votes ADD CONSTRAINT votes_kind_check CHECK (kind IN ('standard', 'poll'));

ALTER TABLE votes ADD COLUMN IF NOT EXISTS allow_multiple boolean NOT NULL DEFAULT false;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_poll_multiple_check;
ALTER TABLE votes ADD CONSTRAINT votes_poll_multiple_check
  CHECK (kind = 'poll' OR allow_multiple = false);

DO $outcome$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'votes'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%carried%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE votes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END
$outcome$;

ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_outcome_check;
ALTER TABLE votes ADD CONSTRAINT votes_outcome_check
  CHECK (outcome IS NULL OR outcome IN ('carried', 'not_carried', 'invalid', 'recorded'));

CREATE TABLE IF NOT EXISTS vote_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL REFERENCES votes (id),
  label text NOT NULL,
  position integer NOT NULL CHECK (position >= 1 AND position <= 10),
  UNIQUE (vote_id, position)
);

CREATE INDEX IF NOT EXISTS vote_options_vote_idx ON vote_options (vote_id, position);

CREATE TABLE IF NOT EXISTS poll_ballots (
  vote_id uuid NOT NULL,
  voter_id uuid NOT NULL,
  cast_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vote_id, voter_id),
  FOREIGN KEY (vote_id, voter_id) REFERENCES vote_electorate (vote_id, profile_id)
);

CREATE TABLE IF NOT EXISTS poll_answers (
  vote_id uuid NOT NULL,
  voter_id uuid NOT NULL,
  option_id uuid NOT NULL REFERENCES vote_options (id),
  PRIMARY KEY (vote_id, voter_id, option_id),
  FOREIGN KEY (vote_id, voter_id) REFERENCES poll_ballots (vote_id, voter_id)
);

CREATE INDEX IF NOT EXISTS poll_answers_option_idx ON poll_answers (option_id);

CREATE OR REPLACE FUNCTION private.guard_vote_option() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'poll options cannot be changed once the poll is open';
  END IF;
  IF current_setting('nocap.option_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'poll options are set when the poll opens';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vote_options_guard ON vote_options;
CREATE TRIGGER vote_options_guard
BEFORE INSERT OR UPDATE OR DELETE ON vote_options
FOR EACH ROW EXECUTE FUNCTION private.guard_vote_option();

CREATE OR REPLACE FUNCTION private.guard_poll_ballot() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
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

DROP TRIGGER IF EXISTS poll_ballots_guard ON poll_ballots;
CREATE TRIGGER poll_ballots_guard
BEFORE INSERT OR UPDATE OR DELETE ON poll_ballots
FOR EACH ROW EXECUTE FUNCTION private.guard_poll_ballot();

CREATE OR REPLACE FUNCTION private.guard_poll_answer() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
BEGIN
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

DROP TRIGGER IF EXISTS poll_answers_guard ON poll_answers;
CREATE TRIGGER poll_answers_guard
BEFORE INSERT OR UPDATE OR DELETE ON poll_answers
FOR EACH ROW EXECUTE FUNCTION private.guard_poll_answer();

CREATE OR REPLACE FUNCTION private.guard_poll_single() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
  n integer;
BEGIN
  SELECT * INTO v FROM votes WHERE id = NEW.vote_id;
  IF v.allow_multiple THEN
    RETURN NULL;
  END IF;
  SELECT count(*)::int INTO n
  FROM poll_answers
  WHERE vote_id = NEW.vote_id AND voter_id = NEW.voter_id;
  IF n > 1 THEN
    RAISE EXCEPTION 'this poll allows one choice';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS poll_answers_single ON poll_answers;
CREATE CONSTRAINT TRIGGER poll_answers_single
AFTER INSERT ON poll_answers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION private.guard_poll_single();

CREATE OR REPLACE FUNCTION private.open_poll(
  p_actor uuid,
  p_subject text,
  p_description text,
  p_deadline timestamptz,
  p_qc numeric,
  p_allow_multiple boolean,
  p_options text[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  new_id uuid;
  cleaned text[] := ARRAY[]::text[];
  opt text;
  pos integer := 0;
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
  IF p_qc < 0 OR p_qc > 100 THEN
    RAISE EXCEPTION 'quorum must be between 0 and 100';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE status = 'active') THEN
    RAISE EXCEPTION 'there are no eligible voters';
  END IF;
  IF p_options IS NULL THEN
    RAISE EXCEPTION 'a poll needs between 2 and 10 options';
  END IF;
  FOREACH opt IN ARRAY p_options LOOP
    opt := trim(opt);
    IF length(opt) = 0 THEN
      RAISE EXCEPTION 'every poll option needs a label';
    END IF;
    IF length(opt) > 120 THEN
      RAISE EXCEPTION 'a poll option must be 120 characters or fewer';
    END IF;
    IF opt = ANY (cleaned) THEN
      RAISE EXCEPTION 'poll options must be different from each other';
    END IF;
    cleaned := array_append(cleaned, opt);
  END LOOP;
  IF cardinality(cleaned) < 2 OR cardinality(cleaned) > 10 THEN
    RAISE EXCEPTION 'a poll needs between 2 and 10 options';
  END IF;

  INSERT INTO votes (
    opened_by, subject, description, deadline,
    quorum_constitutive, quorum_deliberative,
    status, electorate_frozen, kind, allow_multiple
  ) VALUES (
    p_actor, trim(p_subject), trim(p_description), p_deadline,
    p_qc, 0,
    'open', true, 'poll', COALESCE(p_allow_multiple, false)
  ) RETURNING id INTO new_id;

  PERFORM set_config('nocap.option_write', 'on', true);
  FOREACH opt IN ARRAY cleaned LOOP
    pos := pos + 1;
    INSERT INTO vote_options (vote_id, label, position) VALUES (new_id, opt, pos);
  END LOOP;
  PERFORM set_config('nocap.option_write', 'off', true);

  PERFORM set_config('nocap.electorate_write', 'on', true);
  INSERT INTO vote_electorate (vote_id, profile_id)
  SELECT new_id, id FROM profiles WHERE status = 'active';
  PERFORM set_config('nocap.electorate_write', 'off', true);

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.cast_poll(
  p_actor uuid,
  p_vote_id uuid,
  p_option_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
  n_distinct integer;
  n_known integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vote_electorate WHERE vote_id = p_vote_id AND profile_id = p_actor
  ) THEN
    RAISE EXCEPTION 'You are not on the list of eligible voters for this vote.';
  END IF;
  PERFORM 1 FROM vote_electorate
  WHERE vote_id = p_vote_id AND profile_id = p_actor
  FOR UPDATE;

  SELECT * INTO v FROM votes WHERE id = p_vote_id FOR UPDATE;
  IF NOT FOUND OR v.kind IS DISTINCT FROM 'poll' OR v.status <> 'open' OR v.deadline <= now() THEN
    RAISE EXCEPTION 'this vote is not open';
  END IF;
  IF p_option_ids IS NULL OR cardinality(p_option_ids) < 1 THEN
    RAISE EXCEPTION 'Choose at least one option.';
  END IF;
  SELECT count(DISTINCT opt)::int INTO n_distinct FROM unnest(p_option_ids) AS opt;
  IF n_distinct <> cardinality(p_option_ids) THEN
    RAISE EXCEPTION 'each option can be chosen once';
  END IF;
  IF NOT v.allow_multiple AND cardinality(p_option_ids) <> 1 THEN
    RAISE EXCEPTION 'this poll allows one choice';
  END IF;
  SELECT count(*)::int INTO n_known
  FROM vote_options
  WHERE vote_id = p_vote_id AND id = ANY (p_option_ids);
  IF n_known <> cardinality(p_option_ids) THEN
    RAISE EXCEPTION 'that option is not on this poll';
  END IF;
  IF EXISTS (SELECT 1 FROM poll_ballots WHERE vote_id = p_vote_id AND voter_id = p_actor) THEN
    RAISE EXCEPTION 'You have already voted. A vote cannot be changed.';
  END IF;

  PERFORM set_config('nocap.poll_write', 'on', true);
  INSERT INTO poll_ballots (vote_id, voter_id) VALUES (p_vote_id, p_actor);
  INSERT INTO poll_answers (vote_id, voter_id, option_id)
  SELECT p_vote_id, p_actor, opt FROM unnest(p_option_ids) AS opt;
  PERFORM set_config('nocap.poll_write', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION private.close_vote(p_vote_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
  eligible integer;
  n_for integer;
  n_against integer;
  n_abstain integer;
  voted integer;
  const_met boolean;
  delib_met boolean;
  result text;
BEGIN
  SELECT * INTO v FROM votes WHERE id = p_vote_id FOR UPDATE;
  IF NOT FOUND OR v.status <> 'open' THEN
    RETURN;
  END IF;
  IF v.deadline > now() THEN
    RAISE EXCEPTION 'deadline not reached';
  END IF;

  SELECT count(*)::int INTO eligible FROM vote_electorate WHERE vote_id = p_vote_id;

  IF v.kind = 'poll' THEN
    SELECT count(*)::int INTO voted FROM poll_ballots WHERE vote_id = p_vote_id;
    const_met := eligible > 0 AND (voted::numeric * 100) >= (eligible::numeric * v.quorum_constitutive);
    IF NOT const_met THEN
      result := 'invalid';
    ELSE
      result := 'recorded';
    END IF;
    PERFORM set_config('nocap.closing_vote', 'on', true);
    UPDATE votes SET
      status = 'closed',
      closed_at = now(),
      eligible_count = eligible,
      voted_count = voted,
      for_count = 0,
      against_count = 0,
      abstain_count = 0,
      constitutive_met = const_met,
      deliberative_met = NULL,
      outcome = result
    WHERE id = p_vote_id;
    PERFORM set_config('nocap.closing_vote', 'off', true);
    RETURN;
  END IF;

  SELECT
    count(*) FILTER (WHERE choice = 'for')::int,
    count(*) FILTER (WHERE choice = 'against')::int,
    count(*) FILTER (WHERE choice = 'abstain')::int
  INTO n_for, n_against, n_abstain
  FROM ballots WHERE vote_id = p_vote_id;
  voted := n_for + n_against + n_abstain;

  const_met := eligible > 0 AND (voted::numeric * 100) >= (eligible::numeric * v.quorum_constitutive);
  delib_met := voted > 0 AND (n_for::numeric * 100) >= (voted::numeric * v.quorum_deliberative);

  IF NOT const_met THEN
    result := 'invalid';
  ELSIF delib_met THEN
    result := 'carried';
  ELSE
    result := 'not_carried';
  END IF;

  PERFORM set_config('nocap.closing_vote', 'on', true);
  UPDATE votes SET
    status = 'closed',
    closed_at = now(),
    eligible_count = eligible,
    voted_count = voted,
    for_count = n_for,
    against_count = n_against,
    abstain_count = n_abstain,
    constitutive_met = const_met,
    deliberative_met = delib_met,
    outcome = result
  WHERE id = p_vote_id;

  INSERT INTO resolutions (
    vote_id, subject, outcome,
    quorum_constitutive, quorum_deliberative,
    eligible_count, voted_count, for_count, against_count, abstain_count,
    constitutive_met, deliberative_met, closed_at
  ) VALUES (
    p_vote_id, v.subject, result,
    v.quorum_constitutive, v.quorum_deliberative,
    eligible, voted, n_for, n_against, n_abstain,
    const_met, delib_met, now()
  );
  PERFORM set_config('nocap.closing_vote', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION private.seed_close_vote(p_vote_id uuid, p_opened_at timestamptz, p_closed_at timestamptz) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
  eligible integer;
  n_for integer;
  n_against integer;
  n_abstain integer;
  voted integer;
  const_met boolean;
  delib_met boolean;
  result text;
BEGIN
  SELECT * INTO v FROM votes WHERE id = p_vote_id FOR UPDATE;
  IF NOT FOUND OR v.status <> 'open' THEN
    RAISE EXCEPTION 'seed close expected an open vote';
  END IF;
  SELECT count(*)::int INTO eligible FROM vote_electorate WHERE vote_id = p_vote_id;

  IF v.kind = 'poll' THEN
    SELECT count(*)::int INTO voted FROM poll_ballots WHERE vote_id = p_vote_id;
    const_met := eligible > 0 AND (voted::numeric * 100) >= (eligible::numeric * v.quorum_constitutive);
    IF NOT const_met THEN
      result := 'invalid';
    ELSE
      result := 'recorded';
    END IF;
    PERFORM set_config('nocap.closing_vote', 'on', true);
    UPDATE votes SET
      status = 'closed',
      opened_at = p_opened_at,
      deadline = p_closed_at,
      closed_at = p_closed_at,
      eligible_count = eligible,
      voted_count = voted,
      for_count = 0,
      against_count = 0,
      abstain_count = 0,
      constitutive_met = const_met,
      deliberative_met = NULL,
      outcome = result
    WHERE id = p_vote_id;
    PERFORM set_config('nocap.closing_vote', 'off', true);
    RETURN;
  END IF;

  SELECT
    count(*) FILTER (WHERE choice = 'for')::int,
    count(*) FILTER (WHERE choice = 'against')::int,
    count(*) FILTER (WHERE choice = 'abstain')::int
  INTO n_for, n_against, n_abstain
  FROM ballots WHERE vote_id = p_vote_id;
  voted := n_for + n_against + n_abstain;
  const_met := eligible > 0 AND (voted::numeric * 100) >= (eligible::numeric * v.quorum_constitutive);
  delib_met := voted > 0 AND (n_for::numeric * 100) >= (voted::numeric * v.quorum_deliberative);
  IF NOT const_met THEN
    result := 'invalid';
  ELSIF delib_met THEN
    result := 'carried';
  ELSE
    result := 'not_carried';
  END IF;
  PERFORM set_config('nocap.closing_vote', 'on', true);
  UPDATE votes SET
    status = 'closed',
    opened_at = p_opened_at,
    deadline = p_closed_at,
    closed_at = p_closed_at,
    eligible_count = eligible,
    voted_count = voted,
    for_count = n_for,
    against_count = n_against,
    abstain_count = n_abstain,
    constitutive_met = const_met,
    deliberative_met = delib_met,
    outcome = result
  WHERE id = p_vote_id;
  INSERT INTO resolutions (
    vote_id, subject, outcome,
    quorum_constitutive, quorum_deliberative,
    eligible_count, voted_count, for_count, against_count, abstain_count,
    constitutive_met, deliberative_met, closed_at
  ) VALUES (
    p_vote_id, v.subject, result,
    v.quorum_constitutive, v.quorum_deliberative,
    eligible, voted, n_for, n_against, n_abstain,
    const_met, delib_met, p_closed_at
  );
END;
$$;

REVOKE ALL ON vote_options, poll_ballots, poll_answers FROM PUBLIC;
ALTER TABLE vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_answers ENABLE ROW LEVEL SECURITY;

DO $poll_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'GRANT SELECT ON vote_options, poll_ballots, poll_answers TO nocap_app';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_select ON vote_options';
    EXECUTE 'CREATE POLICY nocap_app_select ON vote_options FOR SELECT TO nocap_app USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_select ON poll_ballots';
    EXECUTE 'CREATE POLICY nocap_app_select ON poll_ballots FOR SELECT TO nocap_app USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_select ON poll_answers';
    EXECUTE 'CREATE POLICY nocap_app_select ON poll_answers FOR SELECT TO nocap_app USING (true)';
    EXECUTE 'GRANT EXECUTE ON FUNCTION private.open_poll(uuid, text, text, timestamptz, numeric, boolean, text[]), private.cast_poll(uuid, uuid, uuid[]) TO nocap_app';
  END IF;
END
$poll_grants$;
