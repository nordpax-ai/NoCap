import assert from "node:assert/strict";
import { env } from "../lib/env";
import { seedDatabase } from "./seed";

const off = [undefined, "", "0", "false", "no", "off", "yes", "2", "TRUEE"] as const;
const on = ["true", "TRUE", "True", " true ", "1", " 1 "] as const;

async function withDemo<T>(value: string | undefined, run: () => Promise<T> | T): Promise<T> {
  const previous = process.env.DEMO_MODE;
  if (value === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = value;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previous;
  }
}

async function main(): Promise<void> {
  for (const value of off) {
    await withDemo(value, () => {
      assert.equal(env.demoMode(), false, `DEMO_MODE=${JSON.stringify(value)} must be off`);
    });
  }
  for (const value of on) {
    await withDemo(value, () => {
      assert.equal(env.demoMode(), true, `DEMO_MODE=${JSON.stringify(value)} must be on`);
    });
  }

  const owner = process.env.DATABASE_URL_OWNER;
  const runtime = process.env.DATABASE_URL;
  process.env.DATABASE_URL_OWNER = "postgres://invalid:invalid@127.0.0.1:1/nocap";
  process.env.DATABASE_URL = "postgres://invalid:invalid@127.0.0.1:1/nocap";
  try {
    for (const value of off) {
      const wrote = await withDemo(value, () => seedDatabase({ reset: true }));
      assert.equal(wrote, false, `seedDatabase must refuse DEMO_MODE=${JSON.stringify(value)}`);
    }
  } finally {
    if (owner === undefined) delete process.env.DATABASE_URL_OWNER;
    else process.env.DATABASE_URL_OWNER = owner;
    if (runtime === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = runtime;
  }

  console.log("seed-guard ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
