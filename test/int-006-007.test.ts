import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { expect } from "./expect.ts";
import { canonicalize, serialize } from "../src/jcs.ts";
import {
  EnvelopeReject,
  TYPE_ACTION_AUTHORIZED,
  TYPE_BELIEF_ADMITTED,
  attestation,
  encodeEvent,
  encodePayload,
  pack,
  packFromPayloadObject,
  parseEvent
} from "../src/envelope.ts";
import { stamp } from "../src/temporal.ts";
import { bearer } from "../src/truth.ts";
import {
  EXPECTED_EVENT_ID,
  EXPECTED_EVENT_ID_V1,
  a3Root,
  fixturesDir,
  loadFixture,
  loadV1Fixture
} from "./helpers.ts";

const lockStamp = stamp({
  tEvent: "2026-08-27T08:00:00Z",
  tObserve: "2026-08-27T08:00:01Z",
  tAdmit: "2026-08-27T08:00:02Z",
  tPresent: "2026-08-27T11:00:00Z"
});

describe("INT-006 envelope round-trip from payload lock v2", () => {
  it("JCS(payload lock) and packed event match Kotlin canonical bytes", () => {
    const payloadLock = loadFixture("envelope-payload.json");
    const eventLock = loadFixture("envelope-event.json");
    const rfcLock = loadFixture("envelope-rfc8785.json");
    const rfcInput = readFileSync(join(fixturesDir, "rfc8785-input.json"), "utf8");
    expect(canonicalize(rfcInput)).toBe(rfcLock);
    const payload = JSON.parse(payloadLock) as Record<string, unknown>;
    expect(serialize(payload)).toBe(payloadLock);
    const event = packFromPayloadObject(payload, {
      type: "a3.belief.admitted",
      sourceId: "train",
      subject: "trip.milano"
    });
    expect(event.type).toBe(TYPE_BELIEF_ADMITTED);
    expect(event.id).toBe(EXPECTED_EVENT_ID);
    expect(encodePayload(event.data)).toBe(payloadLock);
    expect(encodeEvent(event)).toBe(eventLock);
    expect(encodeEvent(parseEvent(eventLock))).toBe(eventLock);
    expect(canonicalize(rfcInput)).toBe(rfcLock);
    console.log("PASS INT-006 TS serialize = Kotlin v2 canonical");
  });
});

describe("INT-007 backward compat lock v1", () => {
  it("parses a3.* envelope v1 and emits io.a3ep.* without crashing", () => {
    const v1Event = loadV1Fixture("envelope-event.json");
    const v1Payload = loadV1Fixture("envelope-payload.json");
    expect(v1Event.includes('"type":"a3.belief.admitted"')).toBe(true);
    expect(v1Event.includes("attestation")).toBe(false);
    const parsed = parseEvent(v1Event);
    expect(parsed.type).toBe(TYPE_BELIEF_ADMITTED);
    expect(parsed.data.attestation).toBeUndefined();
    expect(parsed.id).toBe(EXPECTED_EVENT_ID_V1);
    expect(encodePayload(parsed.data)).toBe(v1Payload);
    const emitted = encodeEvent(parsed);
    expect(emitted.includes(`"type":"${TYPE_BELIEF_ADMITTED}"`)).toBe(true);
    expect(emitted.includes('"type":"a3.belief.admitted"')).toBe(false);
    expect(emitted).not.toBe(v1Event);
    console.log(`PASS INT-007 normalized=${parsed.type} event_id_v1=${parsed.id}`);
  });
});

describe("INT-008 CF-004 attester ≠ requester", () => {
  it("rejects attester_id = requester_id on io.a3ep.action.authorized", () => {
    const same = attestation("urn:a3:party:alice", "urn:a3:party:alice");
    expect(() =>
      pack({
        type: TYPE_ACTION_AUTHORIZED,
        sourceId: "train",
        subject: "trip.milano",
        stamp: lockStamp,
        truth: bearer("fact", "observed_signed", "ver-1"),
        content: { depart: "09:30" },
        foldRef: "f80b9b513fc928d11e8aceb66a29d7cfb7540a0bb8451c9017630b105602e9f5",
        attestation: same
      })
    ).toThrowError(/attester_id must not equal requester_id/);
    expect(() =>
      pack({
        type: "a3.action.authorized",
        sourceId: "train",
        subject: "trip.milano",
        stamp: lockStamp,
        truth: bearer("fact", "observed_signed", "ver-1"),
        content: { irreversible: true },
        attestation: same
      })
    ).toThrow(EnvelopeReject);

    const reversible = pack({
      type: TYPE_BELIEF_ADMITTED,
      sourceId: "train",
      subject: "trip.milano",
      stamp: lockStamp,
      truth: bearer("fact", "observed_signed", "ver-1"),
      content: { depart: "09:30" },
      attestation: same
    });
    expect(reversible.type).toBe(TYPE_BELIEF_ADMITTED);

    const v2 = parseEvent(loadFixture("envelope-event.json"));
    expect(v2.data.attestation?.attesterId).not.toBe(v2.data.attestation?.requesterId);
    console.log("PASS INT-008 CF-004 reject on irreversible");
  });
});

describe("INT-009 a3 repo is unmodified", () => {
  it("git diff of the Kotlin repo is empty", () => {
    const diff = execFileSync("git", ["diff", "--stat"], {
      cwd: a3Root,
      encoding: "utf8"
    });
    expect(diff.trim()).toBe("");
    const porcelain = execFileSync("git", ["status", "--porcelain"], {
      cwd: a3Root,
      encoding: "utf8"
    });
    expect(porcelain.trim()).toBe("");
    const pkg = JSON.parse(
      readFileSync(join(fixturesDir, "..", "..", "package.json"), "utf8")
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies ?? {}).toEqual({});
    console.log("PASS INT-009 freeze a3");
  });
});
