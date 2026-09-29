import type { Config, Context } from "@netlify/functions";

export default async function closeVotes(_request: Request, _context: Context) {
  try {
    const { runVoteMaintenance } = await import("../../lib/votes");
    await runVoteMaintenance();
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vote maintenance failed";
    return new Response(message, { status: 500 });
  }
}

export const config: Config = {
  schedule: "*/10 * * * *",
};
