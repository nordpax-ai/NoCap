import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readUpload } from "@/lib/files";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const area = new URL(request.url).searchParams.get("area");
  if (area !== "OFFICIAL" && area !== "SHARED") {
    return NextResponse.json({ error: "Unknown area" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: { area },
    include: { versions: { orderBy: { version: "desc" } } },
  });

  const zip = new JSZip();
  for (const doc of documents) {
    const latest = doc.versions[0];
    if (!latest) continue;
    try {
      const buf = await readUpload(latest.storagePath);
      const folder = area === "OFFICIAL" ? "official-register" : "shared-folder";
      zip.file(`${folder}/${doc.title}-v${latest.version}-${latest.filename}`, buf);
    } catch {
      // skip missing files
    }
  }

  const out = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="nocap-${area.toLowerCase()}.zip"`,
    },
  });
}
