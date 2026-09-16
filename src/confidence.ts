// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
/**
 * Five-dimension confidence. Aggregation is a declared weighted minimum.
 * Recency decays as 2^(-(t_present - t_observe) / 21600). No clock. No average.
 */

import { stamp, type TemporalStamp } from "./temporal.ts";
import { type Provenance, type TruthClass } from "./truth.ts";

export class ConfidenceReject extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfidenceReject";
  }
}

export const DIMENSIONS = [
  "corroboration",
  "evidence_strength",
  "recency",
  "source_reliability",
  "verification"
] as const;

export type ConfidenceVector = {
  sourceReliability: number;
  evidenceStrength: number;
  recency: number;
  corroboration: number;
  verification: number;
};

export type AggregationWeights = {
  sourceReliability: number;
  evidenceStrength: number;
  recency: number;
  corroboration: number;
  verification: number;
};

export type ConfidenceCategory = "high" | "medium" | "low" | "unknown";
export type VerificationGrade = "none" | "sandbox" | "real" | "deterministic";

export const DEFAULT_WEIGHTS: AggregationWeights = {
  sourceReliability: 1.0,
  evidenceStrength: 1.0,
  recency: 0.8,
  corroboration: 0.6,
  verification: 0.9
};

export const UNIT_WEIGHTS: AggregationWeights = {
  sourceReliability: 1.0,
  evidenceStrength: 1.0,
  recency: 1.0,
  corroboration: 1.0,
  verification: 1.0
};

export const HALF_LIFE_SECONDS = 21600;

export const SOURCE_RELIABILITY: Record<Provenance, number> = {
  observed_signed: 1.0,
  human_admitted: 0.8,
  inferred: 0.5,
  derived_model: 0.3
};

export const VERIFICATION_SCORE: Record<VerificationGrade, number> = {
  none: 0.0,
  sandbox: 0.3,
  real: 0.8,
  deterministic: 1.0
};

function requireDim(name: string, value: number): number {
  if (!Number.isFinite(value)) throw new ConfidenceReject(`${name} is not a finite number`);
  if (value < 0 || value > 1) throw new ConfidenceReject(`${name} out of range`);
  return value;
}

export function vector(fields: ConfidenceVector): ConfidenceVector {
  requireDim("source_reliability", fields.sourceReliability);
  requireDim("evidence_strength", fields.evidenceStrength);
  requireDim("recency", fields.recency);
  requireDim("corroboration", fields.corroboration);
  requireDim("verification", fields.verification);
  return fields;
}

export function parseVector(fields: Record<string, unknown>): ConfidenceVector {
  const req = (name: string): number => {
    const raw = fields[name];
    if (raw === undefined || raw === null) throw new ConfidenceReject(`missing ${name}`);
    const value = typeof raw === "number" ? raw : Number(raw);
    return value;
  };
  return vector({
    sourceReliability: req("source_reliability"),
    evidenceStrength: req("evidence_strength"),
    recency: req("recency"),
    corroboration: req("corroboration"),
    verification: req("verification")
  });
}

export function weights(fields: AggregationWeights): AggregationWeights {
  requireDim("weight source_reliability", fields.sourceReliability);
  requireDim("weight evidence_strength", fields.evidenceStrength);
  requireDim("weight recency", fields.recency);
  requireDim("weight corroboration", fields.corroboration);
  requireDim("weight verification", fields.verification);
  if (
    fields.sourceReliability === 0 ||
    fields.evidenceStrength === 0 ||
    fields.recency === 0 ||
    fields.corroboration === 0 ||
    fields.verification === 0
  ) {
    throw new ConfidenceReject("weights must be positive");
  }
  return fields;
}

export function aggregate(
  v: ConfidenceVector,
  w: AggregationWeights = DEFAULT_WEIGHTS
): number {
  const products = [
    v.sourceReliability * w.sourceReliability,
    v.evidenceStrength * w.evidenceStrength,
    v.recency * w.recency,
    v.corroboration * w.corroboration,
    v.verification * w.verification
  ];
  let min = products[0] ?? 0;
  for (let i = 1; i < products.length; i++) {
    const item = products[i];
    if (item !== undefined && item < min) min = item;
  }
  return min;
}

/**
 * Recency is 2^(-(age)/half_life), age clamped at 0.
 * Uses ECMAScript exponentiation on IEEE-754 binary64, which for the
 * lock fixture age 10799/21600 is the correctly rounded value
 * 0.7071294727113612. Kotlin's lock stores the neighbouring double
 * from Java Math.pow (see REVIEW_A3_TS.md). That is not copied here.
 */
export function recencyFromAge(
  ageSeconds: number,
  halfLifeSeconds: number = HALF_LIFE_SECONDS
): number {
  if (halfLifeSeconds <= 0) throw new ConfidenceReject("halfLife must be positive");
  const age = Math.max(0, ageSeconds);
  return 2 ** (-age / halfLifeSeconds);
}

export function recency(stampValue: TemporalStamp, halfLifeSeconds = HALF_LIFE_SECONDS): number {
  stamp(stampValue);
  const age =
    (Date.parse(stampValue.tPresent) - Date.parse(stampValue.tObserve)) / 1000;
  return recencyFromAge(age, halfLifeSeconds);
}

export function corroboration(sourceIds: string[], concordant = true): number {
  if (!concordant) return 0;
  const independent = new Set(
    sourceIds.map((id) => id.trim().toLowerCase()).filter((id) => id.length > 0)
  ).size;
  if (independent <= 1) return 0;
  if (independent === 2) return 0.5;
  return 1;
}

export function evidenceStrength(observationCount: number, concordant = true): number {
  if (observationCount <= 0) return 0;
  if (!concordant) return 0;
  return observationCount === 1 ? 0.5 : 1;
}

export function sourceReliability(provenance: Provenance): number {
  return SOURCE_RELIABILITY[provenance];
}

export function verificationScore(grade: VerificationGrade): number {
  return VERIFICATION_SCORE[grade];
}

export function categoryOf(score: number, truthClass: TruthClass): ConfidenceCategory {
  requireDim("score", score);
  if (score === 0) return "unknown";
  if (score >= 0.8 && truthClass === "fact") return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

export function vectorJson(v: ConfidenceVector): Record<string, number> {
  return {
    corroboration: v.corroboration,
    evidence_strength: v.evidenceStrength,
    recency: v.recency,
    source_reliability: v.sourceReliability,
    verification: v.verification
  };
}

export function weightsJson(w: AggregationWeights): Record<string, number> {
  return {
    corroboration: w.corroboration,
    evidence_strength: w.evidenceStrength,
    recency: w.recency,
    source_reliability: w.sourceReliability,
    verification: w.verification
  };
}

export function assessmentJson(
  v: ConfidenceVector,
  truthClass: TruthClass,
  w: AggregationWeights
): Record<string, unknown> {
  const score = aggregate(v, w);
  return {
    category: categoryOf(score, truthClass),
    score,
    truth_class: truthClass,
    vector: vectorJson(v),
    weights: weightsJson(w)
  };
}

function ones(overrides: Partial<ConfidenceVector> = {}): ConfidenceVector {
  return vector({
    sourceReliability: 1,
    evidenceStrength: 1,
    recency: 1,
    corroboration: 1,
    verification: 1,
    ...overrides
  });
}

export function confidenceLockCorpus(): Record<string, unknown> {
  const t0 = Date.parse("2026-08-27T08:00:00Z");
  const present = Date.parse("2026-08-27T11:00:00Z");
  const fixtureAge = (present - (t0 + 1000)) / 1000;
  const fixtureRecency = recencyFromAge(fixtureAge);
  const defaultW = weights(DEFAULT_WEIGHTS);
  const unit = weights(UNIT_WEIGHTS);
  const fixtureVector = ones({ recency: fixtureRecency });
  const raised = weights({ ...DEFAULT_WEIGHTS, corroboration: 1.0 });
  return {
    config: {
      recency: { half_life_seconds: HALF_LIFE_SECONDS },
      source_reliability: { ...SOURCE_RELIABILITY },
      verification: { ...VERIFICATION_SCORE },
      weights: weightsJson(defaultW)
    },
    corroboration: {
      identical: corroboration(["train", "train", "TRAIN"]),
      one: corroboration(["train"]),
      three: corroboration(["train", "hotel", "calendar"]),
      two: corroboration(["train", "hotel"])
    },
    fixture: assessmentJson(fixtureVector, "fact", defaultW),
    mapping: {
      alta_unit_fact: assessmentJson(ones(), "fact", unit),
      bassa_hypothesis: assessmentJson(ones({ recency: 0.5 }), "hypothesis", defaultW),
      media_default_fact: assessmentJson(ones(), "fact", defaultW),
      media_observation: assessmentJson(ones(), "observation", unit),
      unknown_zero: assessmentJson(ones({ corroboration: 0 }), "fact", defaultW)
    },
    recency: {
      age_0: recencyFromAge(0),
      fixture_10799s: fixtureRecency,
      half_life: recencyFromAge(HALF_LIFE_SECONDS),
      stale_four_half_lives: recencyFromAge(HALF_LIFE_SECONDS * 4),
      two_half_lives: recencyFromAge(HALF_LIFE_SECONDS * 2)
    },
    verification: { ...VERIFICATION_SCORE },
    weights_shift: {
      default_score: aggregate(ones(), defaultW),
      raised_corroboration_score: aggregate(ones(), raised)
    },
    zero_not_compensated: assessmentJson(ones({ verification: 0 }), "fact", defaultW)
  };
}
