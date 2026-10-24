import { pool } from "./db";

// Public pages are statically generated (ISR). On Netlify the build reaches
// the database. A local check build (NOCAP_LOCAL_BUILD=1) cannot, so there the
// prerender falls back to an empty list instead of failing the build.
export async function publicRows<T extends object>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    const { rows } = await pool.query<T>(sql, params);
    return rows;
  } catch (error) {
    if (process.env.NOCAP_LOCAL_BUILD === "1" && process.env.NEXT_PHASE === "phase-production-build") return [];
    throw error;
  }
}
