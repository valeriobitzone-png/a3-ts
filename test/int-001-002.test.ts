import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalize } from "../src/jcs.ts";
import { EXPECTED_EVENT_ID, loadFixture } from "./helpers.ts";
import { join } from "node:path";
import { fixturesDir } from "./helpers.ts";

describe("INT-001 JCS RFC 8785", () => {
  it("matches RFC 8785 appendix A and the envelope-rfc8785 lock", () => {
    const input = readFileSync(join(fixturesDir, "rfc8785-input.json"), "utf8");
    const lock = loadFixture("envelope-rfc8785.json");
    const canonical = canonicalize(input);
    expect(canonical).toBe(lock);
  });

  it("sorts keys and drops whitespace", () => {
    expect(canonicalize('{"b": 2, "a": 1}')).toBe('{"a":1,"b":2}');
    expect(canonicalize('[56,{"d":true,"10":null,"1":[]}]')).toBe(
      '[56,{"1":[],"10":null,"d":true}]'
    );
  });
});

describe("INT-002 envelope lock", () => {
  it("reproduces payload, event, hashes, and event.id", async () => {
    const { serialize } = await import("../src/jcs.ts");
    const { contentId, encodeEvent, packFromPayloadObject } = await import(
      "../src/envelope.ts"
    );
    const { sha256Utf8 } = await import("../src/hash.ts");
    const payloadLock = loadFixture("envelope-payload.json");
    const eventLock = loadFixture("envelope-event.json");
    const hashesLock = loadFixture("envelope-hashes.json");
    const payload = JSON.parse(payloadLock) as Record<string, unknown>;
    expect(serialize(payload)).toBe(payloadLock);
    const event = packFromPayloadObject(payload, {
      type: "a3.belief.admitted",
      sourceId: "train",
      subject: "trip.milano"
    });
    expect(event.id).toBe(EXPECTED_EVENT_ID);
    expect(contentId(event.data)).toBe(EXPECTED_EVENT_ID);
    expect(encodeEvent(event)).toBe(eventLock);
    expect(sha256Utf8(payloadLock)).toBe(EXPECTED_EVENT_ID);
    expect(serialize(JSON.parse(hashesLock))).toBe(hashesLock);
    const hashes = JSON.parse(hashesLock) as Record<string, string>;
    expect(hashes["event_id"]).toBe(EXPECTED_EVENT_ID);
    expect(hashes["envelope-payload.json"]).toBe(EXPECTED_EVENT_ID);
    expect(sha256Utf8(eventLock)).toBe(hashes["envelope-event.json"]);
    expect(sha256Utf8(loadFixture("envelope-rfc8785.json"))).toBe(
      hashes["envelope-rfc8785.json"]
    );
  });
});
