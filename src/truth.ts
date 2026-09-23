// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
/**
 * Truth class and provenance are law of the bearer. UNKNOWN is first-class.
 * HYPOTHESIS becomes FACT only with VerificationAdmitted in REAL.
 * A process receipt is OBSERVATION, never FACT.
 */

export class TruthReject extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TruthReject";
  }
}

export type TruthClass = "fact" | "observation" | "hypothesis" | "unknown";
export type Provenance =
  | "observed_signed"
  | "derived_model"
  | "inferred"
  | "human_admitted";
export type VerificationEnvironment = "real" | "sandbox";
export type SourceType = "direct" | "inferred" | "grounded_by_model";

export type TruthBearer = {
  truthClass: TruthClass;
  provenance: Provenance;
  ref?: string;
};

export type VerificationAdmitted = {
  verificationId: string;
  admittedId: string;
  environment: VerificationEnvironment;
};

export type AxisProjection = {
  support: string;
  freshness: string;
  status: string;
  action: string;
};

const TRUTH_CLASS: TruthClass[] = ["fact", "observation", "hypothesis", "unknown"];
const PROVENANCE: Provenance[] = [
  "observed_signed",
  "derived_model",
  "inferred",
  "human_admitted"
];

function parseEnum<T extends string>(raw: unknown, allowed: T[], field: string): T {
  const name = String(raw).trim().toLowerCase().replace(/-/g, "_");
  const found = allowed.find((item) => item === name);
  if (!found) throw new TruthReject(`unknown ${field}`);
  return found;
}

export function bearer(
  truthClass: TruthClass,
  provenance: Provenance,
  ref?: string
): TruthBearer {
  return ref === undefined ? { truthClass, provenance } : { truthClass, provenance, ref };
}

export function parseBearer(fields: Record<string, unknown>): TruthBearer {
  const rawClass = fields["truth_class"] ?? fields["truthClass"];
  const rawProv = fields["provenance"];
  if (rawClass === undefined || rawClass === null) {
    throw new TruthReject("missing truthClass");
  }
  if (rawProv === undefined || rawProv === null) {
    throw new TruthReject("missing provenance");
  }
  const refRaw = fields["ref"];
  const ref = refRaw === undefined || refRaw === null ? undefined : String(refRaw);
  return bearer(
    parseEnum(rawClass, TRUTH_CLASS, "truthClass"),
    parseEnum(rawProv, PROVENANCE, "provenance"),
    ref
  );
}

export function promoteHypothesis(
  value: TruthBearer,
  verification: VerificationAdmitted | null
): TruthBearer {
  if (value.truthClass !== "hypothesis") {
    throw new TruthReject("only HYPOTHESIS promotes");
  }
  if (verification === null) return value;
  if (verification.environment === "sandbox") {
    return bearer("observation", value.provenance, verification.verificationId);
  }
  return bearer("fact", "observed_signed", verification.verificationId);
}

export function fromInsufficient(provenance: Provenance, ref?: string): TruthBearer {
  return bearer("unknown", provenance, ref);
}

export function fromProcessOutcome(
  exitCode: number,
  printed: string | null = null,
  provenance: Provenance = "observed_signed"
): TruthBearer {
  const label = printed?.trim() ?? "";
  const ref = label.length === 0 ? `exit:${exitCode}` : `exit:${exitCode}:${label}`;
  return bearer("observation", provenance, ref);
}

/**
 * CF-001: FACT from an execution receipt. SPEC_A3-EP §2, §3, §10:
 * receipt ≠ fact, whatever the receipt contains.
 */
export class ReceiptFactReject extends TruthReject {
  readonly code = "CF-001";
  constructor() {
    super("CF-001: FACT from an execution receipt (a receipt is OBSERVATION whatever it contains)");
    this.name = "ReceiptFactReject";
  }
}

/**
 * Any execution receipt (process, tool, HTTP, MCP) is OBSERVATION. The
 * receipt is not read: exit code, printed text, status and payload never
 * decide the truth class.
 */
export function fromReceipt(
  _receipt: unknown,
  provenance: Provenance = "observed_signed",
  ref = "receipt"
): TruthBearer {
  return bearer("observation", provenance, ref);
}

/**
 * Admit a claimed truth class whose basis is a receipt. FACT (any spelling)
 * throws ReceiptFactReject; any other valid class gets the lawful
 * classification, OBSERVATION.
 */
export function admitOnReceipt(claimed: unknown, receipt: unknown, ref = "receipt"): TruthBearer {
  const truthClass = parseEnum(claimed, TRUTH_CLASS, "truthClass");
  if (truthClass === "fact") throw new ReceiptFactReject();
  return fromReceipt(receipt, "observed_signed", ref);
}

export function fromSandbox(verificationId: string, provenance: Provenance): TruthBearer {
  if (!verificationId.trim()) throw new TruthReject("verificationId must be non-blank");
  return bearer("observation", provenance, verificationId);
}

export function fromRealAdmitted(verification: VerificationAdmitted): TruthBearer {
  if (verification.environment !== "real") {
    throw new TruthReject("FACT requires real admitted environment");
  }
  return bearer("fact", "observed_signed", verification.verificationId);
}

export function verificationAdmitted(
  verificationId: string,
  admittedId: string,
  environment: VerificationEnvironment
): VerificationAdmitted {
  if (!verificationId.trim()) throw new TruthReject("verificationId must be non-blank");
  if (!admittedId.trim()) throw new TruthReject("admittedId must be non-blank");
  return { verificationId, admittedId, environment };
}

export function provenanceFrom(sourceType: SourceType): Provenance {
  switch (sourceType) {
    case "direct":
      return "observed_signed";
    case "grounded_by_model":
      return "derived_model";
    case "inferred":
      return "inferred";
  }
}

export function projectAxis(value: TruthBearer, freshness: string): AxisProjection {
  const fresh = freshness.trim().toLowerCase();
  if (!fresh) throw new TruthReject("freshness must be explicit");
  switch (value.truthClass) {
    case "hypothesis":
      return { support: "medium", freshness: fresh, status: "held", action: "na" };
    case "unknown":
      return {
        support: "unknown",
        freshness: fresh,
        status: "unknown",
        action: "unknown"
      };
    case "observation":
      return { support: "medium", freshness: fresh, status: "held", action: "na" };
    case "fact":
      return {
        support: "high",
        freshness: fresh,
        status: fresh === "stale" ? "held" : "believed",
        action: "na"
      };
  }
}

export function requireAxisCoherent(
  value: TruthBearer,
  status: string,
  freshness: string
): void {
  const s = status.trim().toLowerCase();
  const f = freshness.trim().toLowerCase();
  if (value.truthClass === "hypothesis" && s === "believed") {
    throw new TruthReject("HYPOTHESIS cannot declare status BELIEVED");
  }
  if (value.truthClass === "unknown" && s === "believed") {
    throw new TruthReject("UNKNOWN cannot declare status BELIEVED");
  }
  if (value.truthClass === "fact" && s === "believed" && f === "stale") {
    throw new TruthReject("FACT cannot declare BELIEVED when STALE");
  }
}

export function bearerJson(value: TruthBearer): Record<string, unknown> {
  const out: Record<string, unknown> = {
    provenance: value.provenance,
    truth_class: value.truthClass
  };
  if (value.ref !== undefined) out.ref = value.ref;
  return out;
}

export function verificationJson(value: VerificationAdmitted): Record<string, unknown> {
  return {
    admitted_id: value.admittedId,
    environment: value.environment,
    verification_id: value.verificationId
  };
}

export function axisJson(value: AxisProjection): Record<string, unknown> {
  return {
    action: value.action,
    freshness: value.freshness,
    status: value.status,
    support: value.support
  };
}

export function truthLockCorpus(): Record<string, unknown> {
  const hypo = bearer("hypothesis", "derived_model", "model:slot");
  const fact = promoteHypothesis(
    hypo,
    verificationAdmitted("ver-1", "obs-verify", "real")
  );
  return {
    axis_fact_fresh: axisJson(projectAxis(bearer("fact", "observed_signed", "ver-1"), "fresh")),
    axis_fact_stale: axisJson(projectAxis(bearer("fact", "observed_signed", "ver-1"), "stale")),
    axis_hypothesis: axisJson(projectAxis(hypo, "fresh")),
    axis_unknown: axisJson(projectAxis(fromInsufficient("inferred", "gap:price"), "fresh")),
    fact_promoted: bearerJson(fact),
    hypothesis: bearerJson(hypo),
    receipt: bearerJson(fromProcessOutcome(0, "SUCCESS")),
    sandbox: bearerJson(fromSandbox("ver-sand", "observed_signed")),
    unknown: bearerJson(fromInsufficient("inferred", "gap:price")),
    verification: verificationJson(verificationAdmitted("ver-1", "obs-verify", "real"))
  };
}
