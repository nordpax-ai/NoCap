-- Public contact form messages, read by admins in /area/admin/messages. Additive.
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  subject text CHECK (subject IS NULL OR char_length(subject) <= 200),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  client_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  archived boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_client_idx ON contact_messages (client_hash, created_at);

REVOKE ALL ON contact_messages FROM PUBLIC;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON contact_messages TO nocap_app';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_all ON contact_messages';
    EXECUTE 'CREATE POLICY nocap_app_all ON contact_messages FOR ALL TO nocap_app USING (true) WITH CHECK (true)';
  END IF;
END
$grants$;
