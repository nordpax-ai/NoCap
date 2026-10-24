-- schema_migrations is the deploy ledger, not application data.
-- The owner role that runs db:deploy bypasses row level security, so this
-- does not block reading or recording applied migrations. Other roles have
-- no policy, so they cannot read the ledger.

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
