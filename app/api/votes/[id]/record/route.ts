import { requireUser } from "@/lib/auth";
import { downloadResponse } from "@/lib/export";
import { ensureVotePdf } from "@/lib/votes";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  try {
    const pdf = await ensureVotePdf(id);
    return downloadResponse(pdf, `vote-record-${id}.pdf`, "application/pdf");
  } catch {
    return new Response("No record for that vote.", { status: 404 });
  }
}
