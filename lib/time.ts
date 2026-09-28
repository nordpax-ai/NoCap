import { DateTime } from "luxon";
import { env } from "./env";

export function formatWhen(value: Date | string, withTime = true): string {
  const date = value instanceof Date ? value : new Date(value);
  const dt = DateTime.fromJSDate(date).setZone(env.timezone());
  return dt.toFormat(withTime ? "d LLL yyyy, HH:mm ZZZZ" : "d LLL yyyy");
}

export function formatShort(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return DateTime.fromJSDate(date).setZone(env.timezone()).toFormat("d LLL");
}

export function parseClubDateTime(value: string): Date {
  const dt = DateTime.fromISO(value, { zone: env.timezone() });
  if (!dt.isValid) throw new Error("Enter a valid date and time.");
  return dt.toJSDate();
}

export function deadlineInputValue(date: Date): string {
  return DateTime.fromJSDate(date).setZone(env.timezone()).toFormat("yyyy-LL-dd'T'HH:mm");
}
