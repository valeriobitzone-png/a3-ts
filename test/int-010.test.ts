// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "./expect.ts";
import { admitOnReceipt, fromReceipt, ReceiptFactReject } from "../src/truth.ts";
import { fixturesDir } from "./helpers.ts";

type Form = { name: string; receipt: Record<string, unknown> };
type Forms = {
  forms: Form[];
  rule: { claimed_fact_rejects: string[]; claimed_observation_admits: string[] };
};

const doc = JSON.parse(readFileSync(join(fixturesDir, "receipt-forms.json"), "utf8")) as Forms;

describe("INT-010 CF-001 receipt ≠ fact (CS-010)", () => {
  it("classifies every receipt form as OBSERVATION and rejects FACT with CF-001", () => {
    expect(doc.forms.length >= 10).toBe(true);
    let literalMisses = 0;
    for (const form of doc.forms) {
      expect(fromReceipt(form.receipt).truthClass).toBe("observation");
      for (const claimed of doc.rule.claimed_fact_rejects) {
        let err: unknown;
        try {
          admitOnReceipt(claimed, form.receipt);
        } catch (e) {
          err = e;
        }
        expect(err instanceof ReceiptFactReject).toBe(true);
        expect((err as ReceiptFactReject).code).toBe("CF-001");
        expect((err as Error).message.startsWith("CF-001: ")).toBe(true);
      }
      for (const claimed of doc.rule.claimed_observation_admits) {
        expect(admitOnReceipt(claimed, form.receipt).truthClass).toBe("observation");
      }
      if (!(form.receipt["exit_code"] === 0 && form.receipt["printed"] === "SUCCESS")) {
        literalMisses++;
      }
    }
    // negative control: the literal exit-0 + "SUCCESS" rule must fail on these forms
    expect(literalMisses > 0).toBe(true);
    console.log(
      `PASS INT-010 receipt != fact over ${doc.forms.length} forms (literal rule would miss ${literalMisses})`
    );
  });

  it("rejects the CF-001 category fixture", () => {
    const fx = JSON.parse(readFileSync(join(fixturesDir, "receipt-fact-violation.json"), "utf8")) as {
      claimed: { truth_class: string };
    };
    expect(() => admitOnReceipt(fx.claimed.truth_class, fx)).toThrow(ReceiptFactReject);
  });
});
