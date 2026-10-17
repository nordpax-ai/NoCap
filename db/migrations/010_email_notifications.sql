-- Per-member email opt-out. Additive: existing members keep email on.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
