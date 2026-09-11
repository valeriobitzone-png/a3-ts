import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalize, serialize } from "../src/jcs.ts";
import { encodeEvent, encodePayload, packFromPayloadObject } from "../src/envelope.ts";
import { a3Root, fixturesDir, loadFixture } from "./helpers.ts";

describe("INT-006 envelope round-trip from payload lock", () => {
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
    expect(encodePayload(event.data)).toBe(payloadLock);
    expect(encodeEvent(event)).toBe(eventLock);
    expect(canonicalize(rfcInput)).toBe(rfcLock);
  });
});

describe("INT-007 a3 repo is unmodified", () => {
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
  });
});
