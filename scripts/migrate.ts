import { readdirSync, readFileSync } from "fs";
import path from "path";
import { Pool } from "pg";
import { env } from "../lib/env";
import { loadEnv } from "./load-env";

loadEnv();

export async function migrate(): Promise<void> {
  const pool = new Pool({ connectionString: env.ownerDatabaseUrl(), max: 1 });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE id = $1`, [file]);
    if (rows.length) {
      console.log(`skip ${file}`);
      continue;
    }
    const sql = readFileSync(path.join(dir, file), "utf8");
    console.log(`apply ${file}`);
    await pool.query(sql);
    await pool.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [file]);
  }
  await pool.end();
  console.log("migrations done");
}

const entry = process.argv[1] || "";
if (entry.endsWith("migrate.ts") || entry.endsWith("migrate.js")) {
  migrate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
