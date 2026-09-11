import { describe, expect, it } from "vitest";
import {
  aggregate,
  categoryOf,
  ConfidenceReject,
  confidenceLockCorpus,
  corroboration,
  DEFAULT_WEIGHTS,
  parseVector,
  recencyFromAge,
  UNIT_WEIGHTS,
  vector,
  verificationScore
} from "../src/confidence.ts";
import { serialize } from "../src/jcs.ts";
import { loadFixture } from "./helpers.ts";

describe("INT-005 confidence vectors", () => {
  it("reproduces confidence-vectors.json scores", () => {
    const generated = confidenceLockCorpus() as Record<string, unknown>;
    const lock = JSON.parse(loadFixture("confidence-vectors.json")) as Record<
      string,
      unknown
    >;
    expect(serialize(generated.config)).toBe(serialize(lock.config));
    expect(serialize(generated.corroboration)).toBe(serialize(lock.corroboration));
    expect(serialize(generated.mapping)).toBe(serialize(lock.mapping));
    expect(serialize(generated.verification)).toBe(serialize(lock.verification));
    expect(serialize(generated.weights_shift)).toBe(serialize(lock.weights_shift));
    expect(serialize(generated.zero_not_compensated)).toBe(
      serialize(lock.zero_not_compensated)
    );

    const genFixture = generated.fixture as Record<string, unknown>;
    const lockFixture = lock.fixture as Record<string, unknown>;
    expect(genFixture.score).toBe(lockFixture.score);
    expect(genFixture.category).toBe(lockFixture.category);
    expect(genFixture.truth_class).toBe(lockFixture.truth_class);
    expect(serialize(genFixture.weights)).toBe(serialize(lockFixture.weights));

    const genRecency = generated.recency as Record<string, number>;
    const lockRecency = lock.recency as Record<string, number>;
    expect(genRecency.age_0).toBe(lockRecency.age_0);
    expect(genRecency.half_life).toBe(lockRecency.half_life);
    expect(genRecency.two_half_lives).toBe(lockRecency.two_half_lives);
    expect(genRecency.stale_four_half_lives).toBe(lockRecency.stale_four_half_lives);

    // Declared divergence (Kotlin lock, not a TS bug): see REVIEW_A3_TS.md.
    const tsRecency = genRecency.fixture_10799s;
    const kotlinRecency = lockRecency.fixture_10799s;
    expect(JSON.stringify(tsRecency)).toBe("0.7071294727113612");
    expect(JSON.stringify(kotlinRecency)).toBe("0.7071294727113613");
    expect(tsRecency).not.toBe(kotlinRecency);
    const genVec = genFixture.vector as Record<string, number>;
    const lockVec = lockFixture.vector as Record<string, number>;
    expect(JSON.stringify(genVec.recency)).toBe("0.7071294727113612");
    expect(JSON.stringify(lockVec.recency)).toBe("0.7071294727113613");
    expect(serialize({ ...genVec, recency: 0 })).toBe(
      serialize({ ...lockVec, recency: 0 })
    );
  });

  it("weighted min, decay, corroboration, mapping", () => {
    const ones = vector({
      sourceReliability: 1,
      evidenceStrength: 1,
      recency: 1,
      corroboration: 1,
      verification: 1
    });
    expect(aggregate(ones, DEFAULT_WEIGHTS)).toBe(0.6);
    expect(aggregate(ones, UNIT_WEIGHTS)).toBe(1);
    expect(
      aggregate({ ...ones, corroboration: 0 }, DEFAULT_WEIGHTS)
    ).toBe(0);
    expect(categoryOf(0, "fact")).toBe("unknown");
    expect(categoryOf(1, "fact")).toBe("high");
    expect(categoryOf(0.6, "fact")).toBe("medium");
    expect(recencyFromAge(0)).toBe(1);
    expect(recencyFromAge(21600)).toBe(0.5);
    expect(recencyFromAge(43200)).toBe(0.25);
    expect(corroboration(["train"])).toBe(0);
    expect(corroboration(["train", "train", "TRAIN"])).toBe(0);
    expect(corroboration(["train", "hotel"])).toBe(0.5);
    expect(corroboration(["train", "hotel", "calendar"])).toBe(1);
    expect(corroboration(["train", "hotel"], false)).toBe(0);
    expect(verificationScore("sandbox")).toBe(0.3);
    expect(verificationScore("real")).toBe(0.8);
    expect(verificationScore("deterministic")).toBe(1);
    expect(() => parseVector({ source_reliability: 1 })).toThrow(ConfidenceReject);
  });
});
