-- Open registration no longer needs a group code. Additive: no rows deleted.
-- While registration_open is true, anyone with the link can register.
-- code_hash stays in the table (unused) so nothing is dropped.

CREATE OR REPLACE FUNCTION private.register_member_open(
  p_email text,
  p_name text,
  p_password_hash text
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
  IF NOT FOUND OR NOT s.registration_open THEN
    RAISE EXCEPTION 'registration is closed';
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

-- Opening no longer requires a code.
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
      updated_by = p_actor,
      updated_at = now()
  WHERE id;
END;
$$;

-- The old coded function stays but is no longer callable by the app.
REVOKE ALL ON FUNCTION private.register_member(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.register_member_open(text, text, text) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION private.register_member(text, text, text, text) FROM nocap_app';
    EXECUTE 'GRANT EXECUTE ON FUNCTION private.register_member_open(text, text, text) TO nocap_app';
  END IF;
END
$grants$;
