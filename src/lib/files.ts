import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_DOC_BYTES = 20 * 1024 * 1024;

const SAFE_NAME = /[^a-zA-Z0-9._-]+/g;

export function safeFilename(name: string) {
  const base = path.basename(name).replace(SAFE_NAME, "-").slice(0, 120);
  return base || "file";
}

export async function saveUpload(subdir: string, file: File, maxBytes: number) {
  if (file.size > maxBytes) {
    throw new Error(`File too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)`);
  }
  const filename = safeFilename(file.name);
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const stored = `${randomUUID()}-${filename}`;
  const storagePath = path.join(subdir, stored);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_ROOT, storagePath), buf);
  return { filename, storagePath };
}

export async function readUpload(storagePath: string) {
  const resolved = path.resolve(UPLOAD_ROOT, storagePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) {
    throw new Error("Invalid path");
  }
  return readFile(resolved);
}

export function mimeFromName(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".txt") return "text/plain";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

export function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isImage(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp)$/i.test(file.name)
  );
}
