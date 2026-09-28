-- nocap schema.
-- The web process connects as nocap_app. Immutability of closed votes,
-- ballots and resolutions is enforced here, not only in the application.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
-- Grants to nocap_app are applied at the end, and only when that role exists.
-- Netlify DB / Neon gives one non-superuser login. Triggers, not the role name, enforce immutability.

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  status text NOT NULL CHECK (status IN ('invited', 'active', 'deactivated')),
  display_name text NOT NULL,
  firm text,
  city text,
  practice_area text,
  contacts text,
  public_role text,
  bio text,
  jurisdiction text,
  photo_key text,
  is_example boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('invite', 'reset')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Applications and publications
-- ---------------------------------------------------------------------------

CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  firm_and_city text NOT NULL,
  email text NOT NULL,
  proposing_member text,
  practice_description text NOT NULL,
  cv_key text,
  cv_filename text,
  privacy_accepted boolean NOT NULL CHECK (privacy_accepted),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL,
  author_id uuid REFERENCES profiles (id),
  published_on date NOT NULL,
  pdf_key text,
  is_example boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL CHECK (area IN ('register', 'shared')),
  category text NOT NULL CHECK (
    category IN ('charter', 'code_of_conduct', 'minutes', 'resolution', 'other', 'shared')
  ),
  title text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles (id),
  immutable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (area = 'register' AND category <> 'shared')
    OR (area = 'shared' AND category = 'shared')
  )
);

CREATE TABLE document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents (id),
  version_number integer NOT NULL CHECK (version_number >= 1),
  storage_key text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size >= 0),
  uploaded_by uuid NOT NULL REFERENCES profiles (id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE INDEX documents_title_idx ON documents (lower(title));

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles (id),
  title text NOT NULL,
  body text NOT NULL,
  deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE question_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions (id),
  author_id uuid NOT NULL REFERENCES profiles (id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type text NOT NULL CHECK (parent_type IN ('question', 'comment', 'vote')),
  parent_id uuid NOT NULL,
  storage_key text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size >= 0),
  uploaded_by uuid REFERENCES profiles (id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX attachments_parent_idx ON attachments (parent_type, parent_id);

-- ---------------------------------------------------------------------------
-- Votes and the resolutions register
-- ---------------------------------------------------------------------------

CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by uuid NOT NULL REFERENCES profiles (id),
  subject text NOT NULL,
  description text NOT NULL,
  deadline timestamptz NOT NULL,
  quorum_constitutive numeric(5, 2) NOT NULL CHECK (quorum_constitutive >= 0 AND quorum_constitutive <= 100),
  quorum_deliberative numeric(5, 2) NOT NULL CHECK (quorum_deliberative >= 0 AND quorum_deliberative <= 100),
  status text NOT NULL CHECK (status IN ('open', 'closed')),
  electorate_frozen boolean NOT NULL DEFAULT false,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  eligible_count integer,
  voted_count integer,
  for_count integer,
  against_count integer,
  abstain_count integer,
  constitutive_met boolean,
  deliberative_met boolean,
  outcome text CHECK (outcome IN ('carried', 'not_carried', 'invalid')),
  CHECK (
    (status = 'open' AND outcome IS NULL)
    OR (status = 'closed' AND outcome IS NOT NULL AND closed_at IS NOT NULL)
  )
);

CREATE INDEX votes_due_idx ON votes (deadline) WHERE status = 'open';

CREATE TABLE vote_electorate (
  vote_id uuid NOT NULL REFERENCES votes (id),
  profile_id uuid NOT NULL REFERENCES profiles (id),
  PRIMARY KEY (vote_id, profile_id)
);

CREATE TABLE ballots (
  vote_id uuid NOT NULL REFERENCES votes (id),
  voter_id uuid NOT NULL REFERENCES profiles (id),
  choice text NOT NULL CHECK (choice IN ('for', 'against', 'abstain')),
  cast_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vote_id, voter_id),
  FOREIGN KEY (vote_id, voter_id) REFERENCES vote_electorate (vote_id, profile_id)
);

CREATE TABLE resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL UNIQUE REFERENCES votes (id),
  subject text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('carried', 'not_carried', 'invalid')),
  quorum_constitutive numeric(5, 2) NOT NULL,
  quorum_deliberative numeric(5, 2) NOT NULL,
  eligible_count integer NOT NULL,
  voted_count integer NOT NULL,
  for_count integer NOT NULL,
  against_count integer NOT NULL,
  abstain_count integer NOT NULL,
  constitutive_met boolean NOT NULL,
  deliberative_met boolean NOT NULL,
  closed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

CREATE FUNCTION private.guard_document() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.category = 'resolution' OR NEW.immutable THEN
      NEW.immutable := true;
      NEW.category := 'resolution';
      NEW.area := 'register';
    END IF;
    -- nocap_owner is the local migration role. On Neon the login has another
    -- name, so the security-definer functions set nocap.register_write instead.
    IF NEW.area = 'register'
       AND current_user IS DISTINCT FROM 'nocap_owner'
       AND current_setting('nocap.register_write', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'register documents are added by an admin';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.immutable OR OLD.category = 'resolution' THEN
      RAISE EXCEPTION 'resolutions cannot be modified';
    END IF;
    IF NEW.immutable AND NOT OLD.immutable THEN
      RAISE EXCEPTION 'a document cannot be turned into a resolution after it is created';
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.immutable OR OLD.category = 'resolution' THEN
      RAISE EXCEPTION 'resolutions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER documents_guard
BEFORE INSERT OR UPDATE OR DELETE ON documents
FOR EACH ROW EXECUTE FUNCTION private.guard_document();

CREATE FUNCTION private.guard_version() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  doc documents%ROWTYPE;
BEGIN
  SELECT * INTO doc FROM documents WHERE id = COALESCE(NEW.document_id, OLD.document_id);
  IF TG_OP = 'INSERT' THEN
    IF doc.area = 'register'
       AND current_user IS DISTINCT FROM 'nocap_owner'
       AND current_setting('nocap.register_write', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'register versions are added by an admin';
    END IF;
    IF doc.immutable AND EXISTS (
      SELECT 1 FROM document_versions WHERE document_id = NEW.document_id
    ) THEN
      RAISE EXCEPTION 'resolutions cannot be modified';
    END IF;
    RETURN NEW;
  END IF;
  IF doc.immutable OR doc.category = 'resolution' THEN
    RAISE EXCEPTION 'resolutions cannot be modified or deleted';
  END IF;
  RAISE EXCEPTION 'document versions cannot be modified or deleted';
END;
$$;

CREATE TRIGGER document_versions_guard
BEFORE INSERT OR UPDATE OR DELETE ON document_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_version();

CREATE FUNCTION private.guard_vote() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
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

CREATE TRIGGER votes_guard
BEFORE UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION private.guard_vote();

CREATE FUNCTION private.guard_electorate() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF current_setting('nocap.electorate_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'the electorate is frozen when a vote opens';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER electorate_guard
BEFORE INSERT OR UPDATE OR DELETE ON vote_electorate
FOR EACH ROW EXECUTE FUNCTION private.guard_electorate();

CREATE FUNCTION private.guard_ballot() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  v votes%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    -- The seed role may stamp example ballots. The application role has no UPDATE or DELETE grant.
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

CREATE TRIGGER ballots_guard
BEFORE INSERT OR UPDATE OR DELETE ON ballots
FOR EACH ROW EXECUTE FUNCTION private.guard_ballot();

CREATE FUNCTION private.guard_resolution() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('nocap.closing_vote', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'resolutions are created only when a vote closes';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'resolutions cannot be modified or deleted';
END;
$$;

CREATE TRIGGER resolutions_guard
BEFORE INSERT OR UPDATE OR DELETE ON resolutions
FOR EACH ROW EXECUTE FUNCTION private.guard_resolution();

-- ---------------------------------------------------------------------------
-- Operations that must bypass the guards, and only in the allowed direction
-- ---------------------------------------------------------------------------

CREATE FUNCTION private.invite_member(
  p_actor uuid,
  p_email text,
  p_name text,
  p_token_hash text,
  p_expires timestamptz
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
    RAISE EXCEPTION 'only an active admin can invite a member';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE lower(email) = lower(p_email)) THEN
    RAISE EXCEPTION 'that email is already on the list';
  END IF;
  INSERT INTO profiles (email, role, status, display_name)
  VALUES (lower(trim(p_email)), 'member', 'invited', trim(p_name))
  RETURNING id INTO new_id;
  INSERT INTO auth_tokens (profile_id, purpose, token_hash, expires_at)
  VALUES (new_id, 'invite', p_token_hash, p_expires);
  RETURN new_id;
END;
$$;

CREATE FUNCTION private.accept_invite(p_token_hash text, p_password_hash text) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  tok auth_tokens%ROWTYPE;
BEGIN
  SELECT * INTO tok FROM auth_tokens
  WHERE token_hash = p_token_hash AND purpose = 'invite' AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'this invite link is invalid or has expired';
  END IF;
  UPDATE profiles
  SET password_hash = p_password_hash, status = 'active', updated_at = now()
  WHERE id = tok.profile_id AND status = 'invited';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'this invite is no longer valid';
  END IF;
  UPDATE auth_tokens SET used_at = now() WHERE id = tok.id;
  RETURN tok.profile_id;
END;
$$;

CREATE FUNCTION private.reset_password(p_token_hash text, p_password_hash text) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  tok auth_tokens%ROWTYPE;
BEGIN
  SELECT * INTO tok FROM auth_tokens
  WHERE token_hash = p_token_hash AND purpose = 'reset' AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'this reset link is invalid or has expired';
  END IF;
  UPDATE profiles
  SET password_hash = p_password_hash, updated_at = now()
  WHERE id = tok.profile_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'this reset link is no longer valid';
  END IF;
  UPDATE auth_tokens SET used_at = now() WHERE id = tok.id;
  DELETE FROM sessions WHERE profile_id = tok.profile_id;
  RETURN tok.profile_id;
END;
$$;

CREATE FUNCTION private.set_member_status(p_actor uuid, p_target uuid, p_status text) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF p_status NOT IN ('active', 'deactivated') THEN
    RAISE EXCEPTION 'unsupported status';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_actor AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only an active admin can change membership';
  END IF;
  IF p_actor = p_target AND p_status = 'deactivated' THEN
    RAISE EXCEPTION 'you cannot deactivate yourself';
  END IF;
  IF p_status = 'deactivated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = p_target AND role = 'admin'
  ) THEN
    IF (
      SELECT count(*) FROM profiles
      WHERE role = 'admin' AND status = 'active' AND id <> p_target
    ) < 1 THEN
      RAISE EXCEPTION 'cannot deactivate the last admin';
    END IF;
  END IF;
  UPDATE profiles
  SET status = p_status,
      deactivated_at = CASE WHEN p_status = 'deactivated' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_target AND status IN ('active', 'deactivated');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found';
  END IF;
  IF p_status = 'deactivated' THEN
    DELETE FROM sessions WHERE profile_id = p_target;
  END IF;
END;
$$;

CREATE FUNCTION private.create_register_document(
  p_actor uuid,
  p_category text,
  p_title text
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
    RAISE EXCEPTION 'only an admin can add to the official register';
  END IF;
  IF p_category NOT IN ('charter', 'code_of_conduct', 'minutes', 'resolution', 'other') THEN
    RAISE EXCEPTION 'unknown register category';
  END IF;
  PERFORM set_config('nocap.register_write', 'on', true);
  INSERT INTO documents (area, category, title, created_by, immutable)
  VALUES ('register', p_category, trim(p_title), p_actor, p_category = 'resolution')
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE FUNCTION private.add_register_version(
  p_actor uuid,
  p_document uuid,
  p_key text,
  p_filename text,
  p_mime text,
  p_size integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  doc documents%ROWTYPE;
  next_no integer;
  new_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_actor AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only an admin can add to the official register';
  END IF;
  SELECT * INTO doc FROM documents WHERE id = p_document AND area = 'register';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'register document not found';
  END IF;
  SELECT coalesce(max(version_number), 0) + 1 INTO next_no
  FROM document_versions WHERE document_id = p_document;
  IF doc.immutable AND next_no > 1 THEN
    RAISE EXCEPTION 'resolutions cannot be modified';
  END IF;
  PERFORM set_config('nocap.register_write', 'on', true);
  INSERT INTO document_versions (
    document_id, version_number, storage_key, filename, mime_type, byte_size, uploaded_by
  ) VALUES (
    p_document, next_no, p_key, p_filename, p_mime, p_size, p_actor
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE FUNCTION private.create_publication(
  p_actor uuid,
  p_slug text,
  p_title text,
  p_category text,
  p_summary text,
  p_body text,
  p_author uuid,
  p_published date,
  p_pdf_key text
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
    RAISE EXCEPTION 'only an admin can publish';
  END IF;
  INSERT INTO publications (slug, title, category, summary, body, author_id, published_on, pdf_key, is_example)
  VALUES (p_slug, trim(p_title), trim(p_category), trim(p_summary), p_body, p_author, p_published, p_pdf_key, false)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE FUNCTION private.open_vote(
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

CREATE FUNCTION private.close_vote(p_vote_id uuid) RETURNS void
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
  SELECT
    count(*) FILTER (WHERE choice = 'for')::int,
    count(*) FILTER (WHERE choice = 'against')::int,
    count(*) FILTER (WHERE choice = 'abstain')::int
  INTO n_for, n_against, n_abstain
  FROM ballots WHERE vote_id = p_vote_id;
  voted := n_for + n_against + n_abstain;

  -- Constitutive: share of the frozen electorate who cast a ballot.
  -- Abstentions count as participation. 11 members at 50% requires 6.
  const_met := eligible > 0 AND (voted::numeric * 100) >= (eligible::numeric * v.quorum_constitutive);
  -- Deliberative: share of For among votes cast (for, against and abstain).
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

CREATE FUNCTION private.close_due_votes() RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM votes WHERE status = 'open' AND deadline <= now() ORDER BY deadline
  LOOP
    PERFORM private.close_vote(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Used only by the seed script (not granted to nocap_app) so example
-- history can be closed without waiting for a real deadline.
CREATE FUNCTION private.seed_close_vote(p_vote_id uuid, p_opened_at timestamptz, p_closed_at timestamptz) RETURNS void
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

-- ---------------------------------------------------------------------------
-- Privileges. nocap_app cannot update or delete the register.
-- ---------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;

-- Row level security stays on for every table. The permissive policy and the
-- grants exist only when nocap_app does. A single Neon login owns the tables,
-- so it bypasses RLS, and the triggers still apply to it. nocap_app cannot.
DO $grants$
DECLARE
  tbl text;
  has_app boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') INTO has_app;

  IF has_app THEN
    EXECUTE 'GRANT USAGE ON SCHEMA private TO nocap_app';
    EXECUTE 'GRANT USAGE ON SCHEMA public TO nocap_app';
    EXECUTE 'GRANT SELECT ON profiles TO nocap_app';
    EXECUTE 'GRANT UPDATE (display_name, firm, city, practice_area, contacts, public_role, bio, jurisdiction, photo_key, updated_at) ON profiles TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT, DELETE ON sessions TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT ON auth_tokens TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT ON applications TO nocap_app';
    EXECUTE 'GRANT SELECT ON publications TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT ON documents TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT ON document_versions TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT ON questions TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT ON question_comments TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT ON attachments TO nocap_app';
    EXECUTE 'GRANT SELECT ON votes TO nocap_app';
    EXECUTE 'GRANT SELECT ON vote_electorate TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT ON ballots TO nocap_app';
    EXECUTE 'GRANT SELECT ON resolutions TO nocap_app';
    EXECUTE 'GRANT EXECUTE ON FUNCTION
      private.invite_member(uuid, text, text, text, timestamptz),
      private.accept_invite(text, text),
      private.reset_password(text, text),
      private.set_member_status(uuid, uuid, text),
      private.create_register_document(uuid, text, text),
      private.add_register_version(uuid, uuid, text, text, text, integer),
      private.create_publication(uuid, text, text, text, text, text, uuid, date, text),
      private.open_vote(uuid, text, text, timestamptz, numeric, numeric),
      private.close_vote(uuid),
      private.close_due_votes()
    TO nocap_app';
  ELSE
    RAISE NOTICE 'role nocap_app is absent; skipping grants. Immutability is in the triggers.';
  END IF;

  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'sessions', 'auth_tokens', 'applications', 'publications',
    'documents', 'document_versions', 'questions', 'question_comments',
    'attachments', 'votes', 'vote_electorate', 'ballots', 'resolutions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    IF has_app THEN
      EXECUTE format('DROP POLICY IF EXISTS nocap_app_all ON %I', tbl);
      EXECUTE format(
        'CREATE POLICY nocap_app_all ON %I FOR ALL TO nocap_app USING (true) WITH CHECK (true)',
        tbl
      );
    END IF;
  END LOOP;
END
$grants$;

-- seed_close_vote stays callable only by the function owner.
