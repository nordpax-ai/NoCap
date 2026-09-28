function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  ownerDatabaseUrl: () => required("DATABASE_URL_OWNER"),
  appUrl: () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  timezone: () => process.env.APP_TIMEZONE || "Europe/Rome",
  emailProvider: () => (process.env.EMAIL_PROVIDER === "smtp" ? "smtp" : "log"),
  emailFrom: () => process.env.EMAIL_FROM || "nocap <noreply@nocap-law.com>",
  foundingCommitteeEmail: () =>
    process.env.FOUNDING_COMMITTEE_EMAIL || "founding-committee@nocap-law.com",
  contactEmail: () => process.env.CONTACT_EMAIL || "contact@nocap-law.com",
  storageProvider: () => (process.env.STORAGE_PROVIDER === "s3" ? "s3" : "local"),
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
