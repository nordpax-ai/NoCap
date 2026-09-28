import { env } from "../lib/env";
import { loadEnv } from "./load-env";
import { migrate } from "./migrate";
import { seedDatabase } from "./seed";

loadEnv();

async function main(): Promise<void> {
  if (!process.env.NETLIFY_DATABASE_URL && !process.env.NETLIFY_DB_URL && !process.env.DATABASE_URL && !process.env.DATABASE_URL_OWNER) {
    throw new Error("Set NETLIFY_DATABASE_URL (Netlify DB) or DATABASE_URL before db:deploy.");
  }
  console.log("Migrating…");
  await migrate();
  console.log("Seeding demo data if the database is empty…");
  await seedDatabase({ reset: false });
  console.log(`Database ready. Demo admin: paolo.piccirilli@example.invalid / example-password`);
  console.log(`Links in seeded mail use ${env.appUrl()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
