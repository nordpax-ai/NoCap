import { env } from "@/lib/env";
import { closeDueVotes } from "@/lib/votes";

export async function POST(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (header !== `Bearer ${env.cronSecret()}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  await closeDueVotes();
  return Response.json({ ok: true });
}
