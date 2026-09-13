import { describe, it } from "node:test";
import { expect } from "./expect.ts";
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
    const lockBytes = loadFixture("confidence-vectors.json");
    const lock = JSON.parse(lockBytes) as Record<string, unknown>;
    expect(serialize(generated)).toBe(lockBytes);
    const lockFixture = lock.fixture as { score: number };
    expect(lockFixture.score).toBe(0.565703578169089);
    console.log(`PASS INT-005 scores lock v2 fixture=${lockFixture.score}`);
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
