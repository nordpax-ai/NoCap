export type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

export type VoteOutcome = {
  isClosed: boolean;
  eligibleCount: number;
  voted: number;
  notVoted: number;
  forCount: number;
  againstCount: number;
  abstainCount: number;
  participationPercent: number;
  constitutiveRequired: number;
  constitutiveMet: boolean;
  inFavourPercent: number;
  deliberativeRequired: number;
  deliberativeMet: boolean;
  /** Shown, not interpreted as a legal conclusion. */
  record: "open" | "invalid" | "deliberative_met" | "deliberative_not_met";
};

export function computeVoteOutcome(input: {
  eligibleCount: number;
  ballots: { choice: VoteChoice }[];
  constitutivePercent: number;
  deliberativePercent: number;
  now: Date;
  deadline: Date;
  closedAt: Date | null;
}): VoteOutcome {
  const isClosed = Boolean(input.closedAt) || input.now.getTime() >= input.deadline.getTime();
  const voted = input.ballots.length;
  const forCount = input.ballots.filter((b) => b.choice === "FOR").length;
  const againstCount = input.ballots.filter((b) => b.choice === "AGAINST").length;
  const abstainCount = input.ballots.filter((b) => b.choice === "ABSTAIN").length;
  const eligibleCount = input.eligibleCount;
  const participationPercent = eligibleCount === 0 ? 0 : (voted / eligibleCount) * 100;
  const constitutiveMet = participationPercent + 1e-9 >= input.constitutivePercent;
  const inFavourPercent = voted === 0 ? 0 : (forCount / voted) * 100;
  const deliberativeMet = inFavourPercent + 1e-9 >= input.deliberativePercent;

  let record: VoteOutcome["record"] = "open";
  if (isClosed) {
    if (!constitutiveMet) record = "invalid";
    else if (deliberativeMet) record = "deliberative_met";
    else record = "deliberative_not_met";
  }

  return {
    isClosed,
    eligibleCount,
    voted,
    notVoted: Math.max(0, eligibleCount - voted),
    forCount,
    againstCount,
    abstainCount,
    participationPercent,
    constitutiveRequired: input.constitutivePercent,
    constitutiveMet,
    inFavourPercent,
    deliberativeRequired: input.deliberativePercent,
    deliberativeMet,
    record,
  };
}

export function recordLabel(record: VoteOutcome["record"]) {
  switch (record) {
    case "open":
      return "Open";
    case "invalid":
      return "Invalid — constitutive quorum not met";
    case "deliberative_met":
      return "Constitutive quorum met · deliberative threshold met";
    case "deliberative_not_met":
      return "Constitutive quorum met · deliberative threshold not met";
  }
}
