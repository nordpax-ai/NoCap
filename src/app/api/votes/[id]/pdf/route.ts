import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureVoteClosed } from "@/lib/close-votes";
import { computeVoteOutcome, type VoteChoice } from "@/lib/votes";
import { renderVotePdf } from "@/lib/vote-pdf";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await ensureVoteClosed(id);
  const vote = await prisma.vote.findUnique({
    where: { id },
    include: {
      eligible: true,
      ballots: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!vote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!vote.closedAt) {
    return NextResponse.json({ error: "PDF records are produced after close." }, { status: 400 });
  }

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

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nocap-vote-${vote.id}.pdf"`,
    },
  });
}
