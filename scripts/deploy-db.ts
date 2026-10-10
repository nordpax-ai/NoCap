import { databaseTarget, resolveOwnerDatabaseUrl } from "../lib/database-url";
import { env } from "../lib/env";
import { loadEnv } from "./load-env";
import { migrate } from "./migrate";
import { seedDatabase } from "./seed";

loadEnv();

async function main(): Promise<void> {
  const database = resolveOwnerDatabaseUrl();
  console.log(`Migrating ${databaseTarget(database.url)} via ${database.source}…`);
  await migrate();
  if (env.demoMode()) {
    console.log("Seeding demo data if the database is empty…");
    await seedDatabase({ reset: false });
    console.log(`Database ready. Demo admin: paolo.piccirilli@example.invalid / example-password`);
    console.log(`Links in seeded mail use ${env.appUrl()}`);
  } else {
    console.log("DEMO_MODE is not true or 1. Example data was not written.");
    console.log("Database ready.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
