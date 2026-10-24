export function logServerError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: unknown }).code : undefined;
  const digest = typeof error === "object" && error !== null && "digest" in error ? (error as { digest?: unknown }).digest : undefined;
  console.error(`[nocap] ${context}`, { message, code, digest });
}

export function isNextControlFlow(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  return String((error as { digest?: unknown }).digest).startsWith("NEXT_");
}
