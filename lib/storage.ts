import { mkdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import { env } from "./env";

export function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "");
  return (cleaned || "file").slice(0, 80);
}

function assertKey(key: string): string {
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    throw new Error("Invalid storage key");
  }
  return key;
}

async function blobStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "nocap-files", consistency: "strong" });
}

export async function storagePut(key: string, body: Buffer, contentType: string): Promise<void> {
  const safe = assertKey(key);
  if (env.storageDriver() === "netlify-blobs") {
    const store = await blobStore();
    const bytes = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
    await store.set(safe, bytes, { metadata: { contentType } });
    return;
  }
  if (env.storageDriver() === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const cfg = env.s3();
    const client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint || undefined,
      forcePathStyle: true,
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: safe,
        Body: body,
        ContentType: contentType,
      }),
    );
    return;
  }
  const full = path.join(env.storageDir(), safe);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

export async function storageGet(key: string): Promise<Buffer> {
  const safe = assertKey(key);
  if (env.storageDriver() === "netlify-blobs") {
    const store = await blobStore();
    const data = await store.get(safe, { type: "arrayBuffer" });
    if (!data) throw new Error("Empty object");
    return Buffer.from(data);
  }
  if (env.storageDriver() === "s3") {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const cfg = env.s3();
    const client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint || undefined,
      forcePathStyle: true,
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    });
    const result = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: safe }));
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty object");
    return Buffer.from(bytes);
  }
  return readFile(path.join(env.storageDir(), safe));
}

export async function storageExists(key: string): Promise<boolean> {
  try {
    if (env.storageDriver() === "netlify-blobs") {
      const store = await blobStore();
      const meta = await store.getMetadata(assertKey(key));
      return meta !== null;
    }
    if (env.storageDriver() === "s3") {
      await storageGet(key);
      return true;
    }
    await access(path.join(env.storageDir(), assertKey(key)));
    return true;
  } catch {
    return false;
  }
}

export type SavedUpload = {
  buffer: Buffer;
  filename: string;
  mime: string;
  size: number;
};

export async function readUpload(
  entry: FormDataEntryValue | null,
  options: { required?: boolean; maxBytes: number; kinds: "pdf" | "any" | "image" },
): Promise<SavedUpload | null> {
  if (!(entry instanceof File) || entry.size === 0) {
    if (options.required) throw new Error("Please attach the file.");
    return null;
  }
  if (entry.size > options.maxBytes) {
    throw new Error(`That file is larger than ${Math.round(options.maxBytes / (1024 * 1024))} MB.`);
  }
  const mime = entry.type || "application/octet-stream";
  if (options.kinds === "pdf" && mime !== "application/pdf") {
    throw new Error("Please attach a PDF.");
  }
  if (options.kinds === "image" && !["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    throw new Error("Use a JPEG, PNG or WebP photo.");
  }
  const buffer = Buffer.from(await entry.arrayBuffer());
  return { buffer, filename: safeFilename(entry.name || "file"), mime, size: buffer.length };
}
