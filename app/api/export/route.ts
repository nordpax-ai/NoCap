import { requireUser } from "@/lib/auth";
import { buildFullExport, downloadResponse } from "@/lib/export";
import { closeDueVotes } from "@/lib/votes";

export async function GET() {
  await requireUser();
  await closeDueVotes();
  const zip = await buildFullExport();
  const stamp = new Date().toISOString().slice(0, 10);
  return downloadResponse(zip, `nocap-export-${stamp}.zip`, "application/zip");
}
