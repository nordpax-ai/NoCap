-- Open registration with a group code. Additive: no existing rows change.
-- The code is stored only as a keyed hash; an admin can set or replace it,
-- never read it back.

CREATE TABLE IF NOT EXISTS registration_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  registration_open boolean NOT NULL DEFAULT false,
  code_hash text,
  updated_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO registration_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS registration_attempts (
  id bigserial PRIMARY KEY,
  client_hash text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registration_attempts_client_idx
  ON registration_attempts (client_hash, created_at);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joined_via text;

REVOKE ALL ON registration_settings, registration_attempts FROM PUBLIC;
ALTER TABLE registration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.register_member(
  p_email text,
  p_name text,
  p_password_hash text,
  p_code_hash text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  s registration_settings%ROWTYPE;
  new_id uuid;
BEGIN
  SELECT * INTO s FROM registration_settings WHERE id;
  IF NOT FOUND OR NOT s.registration_open OR s.code_hash IS NULL THEN
    RAISE EXCEPTION 'registration is closed';
  END IF;
  IF p_code_hash IS DISTINCT FROM s.code_hash THEN
    RAISE EXCEPTION 'registration details not accepted';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE lower(email) = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'registration details not accepted';
  END IF;
  INSERT INTO profiles (email, password_hash, role, status, display_name, joined_via)
  VALUES (lower(trim(p_email)), p_password_hash, 'member', 'active', trim(p_name), 'register')
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_registration(
  p_actor uuid,
  p_open boolean,
  p_code_hash text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_actor AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'only an active admin can change registration';
  END IF;
  UPDATE registration_settings
  SET registration_open = COALESCE(p_open, registration_open),
      code_hash = COALESCE(p_code_hash, code_hash),
      updated_by = p_actor,
      updated_at = now()
  WHERE id;
  IF COALESCE(p_open, false) AND (SELECT code_hash FROM registration_settings WHERE id) IS NULL THEN
    RAISE EXCEPTION 'set a group code before opening registration';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.register_member(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.set_registration(uuid, boolean, text) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'GRANT SELECT ON registration_settings TO nocap_app';
    EXECUTE 'GRANT SELECT, INSERT, DELETE ON registration_attempts TO nocap_app';
    EXECUTE 'GRANT USAGE ON SEQUENCE registration_attempts_id_seq TO nocap_app';
    EXECUTE 'GRANT EXECUTE ON FUNCTION private.register_member(text, text, text, text), private.set_registration(uuid, boolean, text) TO nocap_app';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_all ON registration_settings';
    EXECUTE 'CREATE POLICY nocap_app_all ON registration_settings FOR ALL TO nocap_app USING (true) WITH CHECK (true)';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_all ON registration_attempts';
    EXECUTE 'CREATE POLICY nocap_app_all ON registration_attempts FOR ALL TO nocap_app USING (true) WITH CHECK (true)';
  END IF;
END
$grants$;
