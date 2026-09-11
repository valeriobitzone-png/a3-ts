import { describe, expect, it } from "vitest";
import { serialize } from "../src/jcs.ts";
import {
  currentJson,
  dedup,
  fold,
  foldJson,
  observationJson,
  order,
  referenceCorpus,
  stamp,
  stampJson,
  TemporalReject
} from "../src/temporal.ts";
import { loadFixture, permutations } from "./helpers.ts";

describe("INT-003 temporal locks", () => {
  it("rejects inverted times", () => {
    expect(() =>
      stamp({
        tEvent: "2026-08-27T08:00:00Z",
        tObserve: "2026-08-27T07:59:59Z",
        tAdmit: "2026-08-27T08:00:00Z",
        tPresent: "2026-08-27T11:00:00Z"
      })
    ).toThrow(TemporalReject);
    expect(() =>
      stamp({
        tEvent: "2026-08-27T08:00:00Z",
        tObserve: "2026-08-27T08:00:05Z",
        tAdmit: "2026-08-27T08:00:04Z",
        tPresent: "2026-08-27T11:00:00Z"
      })
    ).toThrow(TemporalReject);
  });

  it("matches tm-order, tm-dedup, tm-fold including permutations", () => {
    const corpus = referenceCorpus();
    const ordered = order(corpus);
    expect(serialize(ordered.map(observationJson))).toBe(loadFixture("tm-order.json"));
    const hotel = ordered.find((row) => row.sourceId === "hotel");
    expect(hotel).toBeDefined();
    expect(serialize(stampJson(hotel!.stamp))).toBe(
      '{"t_admit":"2026-08-27T10:00:01Z","t_event":"2026-08-27T08:00:00Z","t_observe":"2026-08-27T10:00:00Z","t_present":"2026-08-27T11:00:00Z"}'
    );
    expect(serialize(currentJson(dedup(corpus)))).toBe(loadFixture("tm-dedup.json"));
    const folded = fold(corpus);
    expect(folded).toHaveLength(1);
    expect(serialize(foldJson(folded[0]!))).toBe(loadFixture("tm-fold.json"));
    const foldBytes = loadFixture("tm-fold.json");
    const orderBytes = loadFixture("tm-order.json");
    const dedupBytes = loadFixture("tm-dedup.json");
    for (const perm of permutations(corpus)) {
      expect(serialize(order(perm).map(observationJson))).toBe(orderBytes);
      expect(serialize(currentJson(dedup(perm)))).toBe(dedupBytes);
      expect(serialize(foldJson(fold(perm)[0]!))).toBe(foldBytes);
    }
    expect(foldBytes.includes("confidence")).toBe(false);
  });
});
