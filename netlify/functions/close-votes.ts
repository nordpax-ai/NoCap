import { Pool } from "pg";
import type { Config, Context } from "@netlify/functions";

export default async function closeVotes(_request: Request, _context: Context) {
  const connectionString =
    process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return new Response("No database URL", { status: 500 });
  }
  const pool = new Pool({ connectionString, max: 1 });
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
