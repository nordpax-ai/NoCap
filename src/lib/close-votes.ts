import { prisma } from "./prisma";

/** Persist closedAt the first time a deadline is observed as past. */
export async function closeExpiredVotes() {
  const now = new Date();
  await prisma.vote.updateMany({
    where: { closedAt: null, deadline: { lte: now } },
    data: { closedAt: now },
  });
}

export async function ensureVoteClosed(voteId: string) {
  const vote = await prisma.vote.findUnique({ where: { id: voteId } });
  if (!vote) return null;
  if (!vote.closedAt && vote.deadline.getTime() <= Date.now()) {
    return prisma.vote.update({
      where: { id: voteId },
      data: { closedAt: new Date() },
    });
  }
  return vote;
}
