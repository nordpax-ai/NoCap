#!/usr/bin/env bash
# Creates the local roles and database. Safe to run more than once.
set -euo pipefail

if ! command -v psql >/dev/null; then
  echo "PostgreSQL client not found. Install PostgreSQL 16+ first." >&2
  exit 1
fi

psql_as() {
  if [ "$(id -un)" = "postgres" ]; then
    psql "$@"
  elif command -v sudo >/dev/null && sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
    sudo -u postgres psql "$@"
  else
    psql "$@"
  fi
}

psql_as -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  CREATE ROLE nocap_owner LOGIN PASSWORD 'nocap_owner';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE nocap_app LOGIN PASSWORD 'nocap_app';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
SQL

if ! psql_as -tAc "SELECT 1 FROM pg_database WHERE datname='nocap'" | grep -q 1; then
  psql_as -v ON_ERROR_STOP=1 -c "CREATE DATABASE nocap OWNER nocap_owner;"
fi

psql_as -d nocap -v ON_ERROR_STOP=1 -c "GRANT CONNECT ON DATABASE nocap TO nocap_app;"
echo "Database nocap is ready. Copy .env.example to .env.local, then npm run db:migrate && npm run db:seed"
