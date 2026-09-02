import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { mimeFromName, readUpload } from "@/lib/files";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const storagePath = path.join("/");
  const download = new URL(request.url).searchParams.get("download") === "1";

  const isPhoto = storagePath.startsWith("photos/");
  const isApplication = storagePath.startsWith("applications/");
  const user = await getSessionUser();

  if (!isPhoto && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isApplication && user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isPhoto) {
    const owner = await prisma.user.findFirst({
      where: { photoPath: storagePath, status: "ACTIVE" },
    });
    if (!owner && !user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  try {
    const buf = await readUpload(storagePath);
    const filename = storagePath.split("/").pop() || "file";
    const headers = new Headers({
      "Content-Type": mimeFromName(filename),
      "Cache-Control": "private, max-age=3600",
    });
    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    }
    return new NextResponse(new Uint8Array(buf), { headers });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
