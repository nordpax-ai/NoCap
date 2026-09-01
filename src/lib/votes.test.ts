import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeVoteOutcome } from "./votes";

const now = new Date("2026-06-01T12:00:00Z");
const future = new Date("2026-07-01T12:00:00Z");
const past = new Date("2026-05-01T12:00:00Z");

describe("computeVoteOutcome", () => {
  it("counts abstentions as participation for constitutive quorum", () => {
    const outcome = computeVoteOutcome({
      eligibleCount: 4,
      ballots: [{ choice: "FOR" }, { choice: "ABSTAIN" }],
      constitutivePercent: 50,
      deliberativePercent: 66,
      now,
      deadline: future,
      closedAt: now,
    });
    assert.equal(outcome.voted, 2);
    assert.equal(outcome.participationPercent, 50);
    assert.equal(outcome.constitutiveMet, true);
    assert.equal(outcome.inFavourPercent, 50);
    assert.equal(outcome.deliberativeMet, false);
    assert.equal(outcome.record, "deliberative_not_met");
  });

  it("marks the record invalid when constitutive quorum fails", () => {
    const outcome = computeVoteOutcome({
      eligibleCount: 10,
      ballots: [
        { choice: "FOR" },
        { choice: "FOR" },
        { choice: "FOR" },
      ],
      constitutivePercent: 50,
      deliberativePercent: 50,
      now,
      deadline: past,
      closedAt: null,
    });
    assert.equal(outcome.isClosed, true);
    assert.equal(outcome.constitutiveMet, false);
    assert.equal(outcome.deliberativeMet, true);
    assert.equal(outcome.record, "invalid");
  });

  it("treats a vote as closed after the deadline even without closedAt", () => {
    const outcome = computeVoteOutcome({
      eligibleCount: 2,
      ballots: [{ choice: "FOR" }, { choice: "FOR" }],
      constitutivePercent: 50,
      deliberativePercent: 50,
      now,
      deadline: past,
      closedAt: null,
    });
    assert.equal(outcome.isClosed, true);
    assert.equal(outcome.record, "deliberative_met");
  });

  it("stays open before the deadline", () => {
    const outcome = computeVoteOutcome({
      eligibleCount: 2,
      ballots: [],
      constitutivePercent: 50,
      deliberativePercent: 50,
      now,
      deadline: future,
      closedAt: null,
    });
    assert.equal(outcome.isClosed, false);
    assert.equal(outcome.record, "open");
  });
});
