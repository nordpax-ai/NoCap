import { Pool } from "pg";
import type { Config, Context } from "@netlify/functions";
import { pgPoolConfig, resolveDatabaseUrl } from "../../lib/database-url";

export default async function closeVotes(_request: Request, _context: Context) {
  let connectionString: string;
  try {
    connectionString = resolveDatabaseUrl().url;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No database URL";
    return new Response(message, { status: 500 });
  }
  const pool = new Pool(pgPoolConfig(connectionString, 1));
  try {
    const { rows } = await pool.query<{ closed: number }>(`SELECT private.close_due_votes() AS closed`);
    return Response.json({ closed: Number(rows[0]?.closed ?? 0) });
  } finally {
    await pool.end();
  }
}

export const config: Config = {
  schedule: "*/10 * * * *",
};
