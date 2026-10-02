import { requireUser } from "@/lib/auth";
import { buildDocumentsZip, downloadResponse } from "@/lib/export";

export async function POST(request: Request) {
  await requireUser();
  const form = await request.formData();
  const ids = form.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) {
    return new Response("Select at least one document.", { status: 400 });
  }
  const zip = await buildDocumentsZip(ids);
  return downloadResponse(zip, "nocap-documents.zip", "application/zip");
}
