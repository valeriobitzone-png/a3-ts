import { describe, expect, it } from "vitest";
import { serialize } from "../src/jcs.ts";
import {
  bearer,
  fromProcessOutcome,
  fromRealAdmitted,
  fromSandbox,
  parseBearer,
  promoteHypothesis,
  projectAxis,
  requireAxisCoherent,
  TruthReject,
  truthLockCorpus,
  verificationAdmitted
} from "../src/truth.ts";
import { loadFixture } from "./helpers.ts";

describe("INT-004 truth vectors and TR invariants", () => {
  it("reproduces truth-vectors.json", () => {
    expect(serialize(truthLockCorpus())).toBe(loadFixture("truth-vectors.json"));
  });

  it("TR-001 promotion only with REAL verification", () => {
    const hypo = bearer("hypothesis", "derived_model", "model:slot");
    expect(promoteHypothesis(hypo, null).truthClass).toBe("hypothesis");
    const sand = promoteHypothesis(
      hypo,
      verificationAdmitted("ver-sand", "obs-sand", "sandbox")
    );
    expect(sand.truthClass).toBe("observation");
    const fact = promoteHypothesis(
      hypo,
      verificationAdmitted("ver-1", "obs-verify", "real")
    );
    expect(fact.truthClass).toBe("fact");
    expect(fact.provenance).toBe("observed_signed");
    expect(fact.ref).toBe("ver-1");
    expect(() =>
      promoteHypothesis(
        bearer("observation", "observed_signed"),
        verificationAdmitted("ver-1", "obs-verify", "real")
      )
    ).toThrow(TruthReject);
  });

  it("TR-002..006 explicit rejects and receipt ≠ fact", () => {
    const unknown = parseBearer({
      truth_class: "unknown",
      provenance: "inferred",
      ref: "gap:price"
    });
    expect(unknown.truthClass).toBe("unknown");
    expect(() => parseBearer({ truth_class: "fact" })).toThrowError("missing provenance");
    expect(() => parseBearer({ provenance: "observed_signed" })).toThrowError(
      "missing truthClass"
    );
    const receipt = fromProcessOutcome(0, "SUCCESS");
    expect(receipt.truthClass).toBe("observation");
    expect(receipt.ref).toBe("exit:0:SUCCESS");
    expect(fromSandbox("ver-sand", "observed_signed").truthClass).toBe("observation");
    expect(() =>
      fromRealAdmitted(verificationAdmitted("ver-sand", "obs-sand", "sandbox"))
    ).toThrow(TruthReject);
    expect(projectAxis(hypo(), "fresh").status).not.toBe("believed");
    expect(projectAxis(unknown, "fresh").support).toBe("unknown");
    expect(projectAxis(bearer("fact", "observed_signed", "ver-1"), "fresh").status).toBe(
      "believed"
    );
    expect(projectAxis(bearer("fact", "observed_signed", "ver-1"), "stale").status).toBe(
      "held"
    );
    expect(() => requireAxisCoherent(hypo(), "believed", "fresh")).toThrow(TruthReject);
    expect(() =>
      requireAxisCoherent(bearer("fact", "observed_signed", "ver-1"), "believed", "stale")
    ).toThrow(TruthReject);
  });
});

function hypo() {
  return bearer("hypothesis", "derived_model", "model:slot");
}
