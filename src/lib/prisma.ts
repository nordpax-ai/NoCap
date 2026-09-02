import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function preparePreviewDatabase() {
  const serverless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!serverless) return;

  const dest = "/tmp/nocap-preview.db";
  if (!existsSync(dest)) {
    const candidates = [
      path.join(process.cwd(), "prisma", "preview.db"),
      path.join(process.cwd(), "prisma", "dev.db"),
      path.join(process.cwd(), "preview.db"),
      path.join(process.cwd(), "dev.db"),
    ];
    const src = candidates.find((file) => existsSync(file));
    if (src) copyFileSync(src, dest);
  }
  if (existsSync(dest)) {
    process.env.DATABASE_URL = `file:${dest}`;
  }
}

preparePreviewDatabase();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
