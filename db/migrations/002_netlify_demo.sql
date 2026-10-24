-- Applied on databases that already ran 001, and again on a fresh Neon database.
-- Register writes are allowed for the local nocap_owner role, or when the
-- session flag nocap.register_write is on. That flag is set inside the
-- security-definer functions, so a single non-superuser Neon login can seed
-- and upload without being named nocap_owner. Closed votes and resolutions
-- stay immutable for every role, including the table owner.

CREATE OR REPLACE FUNCTION private.guard_document() RETURNS trigger
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

CREATE OR REPLACE FUNCTION private.guard_version() RETURNS trigger
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

CREATE OR REPLACE FUNCTION private.create_register_document(
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

CREATE OR REPLACE FUNCTION private.add_register_version(
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

CREATE TABLE IF NOT EXISTS email_log (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  recipients text[] NOT NULL,
  subject text NOT NULL,
  body text NOT NULL
);

REVOKE ALL ON email_log FROM PUBLIC;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DO $mail$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'GRANT SELECT, INSERT ON email_log TO nocap_app';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_all ON email_log';
    EXECUTE 'CREATE POLICY nocap_app_all ON email_log FOR ALL TO nocap_app USING (true) WITH CHECK (true)';
  END IF;
END
$mail$;
