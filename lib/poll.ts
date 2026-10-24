export type PollCount = { label: string; count: number };

export function formatShare(count: number, ballots: number): string {
  if (ballots <= 0) return "0";
  const value = Math.round((count / ballots) * 1000) / 10;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatPollCounts(options: PollCount[], ballots: number): string {
  return options
    .map((option) => `${option.label} ${option.count} (${formatShare(option.count, ballots)}%)`)
    .join(", ");
}

export function leadingTie(options: PollCount[]): string[] {
  if (options.length === 0) return [];
  const top = Math.max(...options.map((option) => option.count));
  if (top <= 0) return [];
  const leaders = options.filter((option) => option.count === top);
  return leaders.length > 1 ? leaders.map((option) => option.label) : [];
}

export function closedVoteLine(vote: {
  kind?: string | null;
  outcome: string | null;
  for_count: number | null;
  against_count: number | null;
  abstain_count: number | null;
  poll_summary?: string | null;
}): string {
  const label =
    vote.outcome === "carried"
      ? "Carried"
      : vote.outcome === "not_carried"
        ? "Not carried. Majority not reached."
        : vote.outcome === "invalid"
          ? "Invalid. Constitutive quorum not reached (minimum participation)."
          : vote.outcome === "recorded"
            ? "Recorded."
            : (vote.outcome ?? "");
  if (vote.kind === "poll") return `${label} ${vote.poll_summary ?? ""}`.trim();
  const abstain = vote.abstain_count ?? 0;
  return `${label} ${vote.for_count} for, ${vote.against_count} against, ${abstain} abstention${abstain === 1 ? "" : "s"}`;
}

export function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
