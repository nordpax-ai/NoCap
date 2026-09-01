import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { closeExpiredVotes } from "@/lib/close-votes";
import { computeVoteOutcome, type VoteChoice } from "@/lib/votes";
import { renderVotePdf } from "@/lib/vote-pdf";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await closeExpiredVotes();

  const votes = await prisma.vote.findMany({
    where: { closedAt: { not: null } },
    include: {
      eligible: true,
      ballots: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { openedAt: "asc" },
  });

  const zip = new JSZip();
  for (const vote of votes) {
    const outcome = computeVoteOutcome({
      eligibleCount: vote.eligible.length,
      ballots: vote.ballots.map((b) => ({ choice: b.choice as VoteChoice })),
      constitutivePercent: vote.constitutivePercent,
      deliberativePercent: vote.deliberativePercent,
      now: new Date(),
      deadline: vote.deadline,
      closedAt: vote.closedAt,
    });
    const pdf = await renderVotePdf({
      object: vote.object,
      description: vote.description,
      openedAt: vote.openedAt,
      deadline: vote.deadline,
      closedAt: vote.closedAt,
      constitutivePercent: vote.constitutivePercent,
      deliberativePercent: vote.deliberativePercent,
      outcome,
      eligible: vote.eligible.map((e) => ({ name: e.nameSnapshot })),
      ballots: vote.ballots.map((b) => ({
        name: b.user.name,
        choice: b.choice as VoteChoice,
        createdAt: b.createdAt,
      })),
    });
    const safe = vote.object.replace(/[^\w]+/g, "-").slice(0, 60);
    zip.file(`resolutions/${safe}-${vote.id}.pdf`, pdf);
  }

  const out = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="nocap-resolutions-register.zip"',
    },
  });
}
