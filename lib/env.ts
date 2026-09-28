function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function databaseUrlFromEnv(): string {
  return (
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DB_URL ||
    required("DATABASE_URL")
  );
}

export type StorageDriver = "local" | "s3" | "netlify-blobs";

export const env = {
  // Netlify DB (Neon) injects NETLIFY_DATABASE_URL, or NETLIFY_DB_URL on the current product.
  // DATABASE_URL is the local fallback.
  databaseUrl: () => databaseUrlFromEnv(),
  ownerDatabaseUrl: () => process.env.DATABASE_URL_OWNER || databaseUrlFromEnv(),
  appUrl: () =>
    (process.env.APP_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
  timezone: () => process.env.APP_TIMEZONE || "Europe/Rome",
  emailProvider: () => (process.env.EMAIL_PROVIDER === "smtp" ? "smtp" : "log"),
  emailFrom: () => process.env.EMAIL_FROM || "nocap <noreply@nocap-law.com>",
  foundingCommitteeEmail: () =>
    process.env.FOUNDING_COMMITTEE_EMAIL || "founding-committee@nocap-law.com",
  contactEmail: () => process.env.CONTACT_EMAIL || "contact@nocap-law.com",
  storageDriver: (): StorageDriver => {
    const raw = process.env.STORAGE_DRIVER || process.env.STORAGE_PROVIDER;
    if (raw === "netlify-blobs" || raw === "s3" || raw === "local") return raw;
    if (process.env.NETLIFY === "true") return "netlify-blobs";
    return "local";
  },
  demoMode: () =>
    process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true" || process.env.NETLIFY === "true",
  storageDir: () => process.env.STORAGE_LOCAL_DIR || "./var/storage",
  cronSecret: () => process.env.CRON_SECRET || "change-me",
  sessionDays: () => Number(process.env.SESSION_DAYS || "30"),
  smtp: () => ({
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || "587"),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  }),
  s3: () => ({
    endpoint: process.env.S3_ENDPOINT || "",
    region: process.env.S3_REGION || "eu-central-1",
    bucket: process.env.S3_BUCKET || "",
    accessKey: process.env.S3_ACCESS_KEY || "",
    secretKey: process.env.S3_SECRET_KEY || "",
  }),
};
