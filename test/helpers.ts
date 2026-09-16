// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const fixturesDir = join(here, "fixtures");
export const fixturesV1Dir = join(fixturesDir, "v1");
export const a3Root = join(here, "..", "..", "a3");

/** SHA-256 of lock v2 files (conformance/vectors/v2/vector-sha256.json). */
export const LOCK_SHA256: Record<string, string> = {
  "tm-order.json": "e805711fc39d48a59b47bfdd147737016db56a3a68511f27229e769691378a6e",
  "tm-dedup.json": "b6b05fefb45b1f9ff2fc882d16eb5a1f0b1cf96e6d8455070836d472e333e0ba",
  "tm-fold.json": "f80b9b513fc928d11e8aceb66a29d7cfb7540a0bb8451c9017630b105602e9f5",
  "truth-vectors.json": "1ddb48779a470fd65adc59a5e0245767f07bd4ea91ad70b7c3e10afbdebab5d6",
  "envelope-rfc8785.json": "2d5e01a318d0f0879ab568c4be289c8b1f64ef8921a53c6277d5e069978baacb",
  "envelope-payload.json": "1fec213fbaf6d420cf9ff95c51c022c4cdfb1f43fabcf82647e03c03f92f2b7b",
  "envelope-event.json": "fa6e007a23751ad55c22291b64982f0d7c8287eb5723b446a3a5fd72c470e939",
  "envelope-hashes.json": "d27e67f05719b77daeb14a4d219a87cb332998fe2c6d163571f35e7b90d76ff5",
  "confidence-vectors.json": "25efbc9f1b3730658c34502f2564d18a8aad04c1ee202b672be4b020917fddee"
};

export const EXPECTED_EVENT_ID_V1 =
  "477e868489f5c48d138e4c084e9bf13a40ed66390b964365869f7578dfa2e75a";

export const EXPECTED_EVENT_ID =
  "1fec213fbaf6d420cf9ff95c51c022c4cdfb1f43fabcf82647e03c03f92f2b7b";

export function sha256Of(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function loadFixture(name: string): string {
  const bytes = readFileSync(join(fixturesDir, name));
  const expected = LOCK_SHA256[name];
  if (expected) {
    const digest = sha256Of(bytes);
    if (digest !== expected) {
      throw new Error(`SHA-256 mismatch for ${name}: ${digest} != ${expected}`);
    }
  }
  return bytes.toString("utf8");
}

export function loadV1Fixture(name: string): string {
  return readFileSync(join(fixturesV1Dir, name), "utf8");
}

export function permutations<T>(list: T[]): T[][] {
  if (list.length <= 1) return [list];
  const out: T[][] = [];
  for (let i = 0; i < list.length; i++) {
    const rest = list.filter((_, j) => j !== i);
    const head = list[i];
    if (head === undefined) continue;
    for (const p of permutations(rest)) {
      out.push([head, ...p]);
    }
  }
  return out;
}
