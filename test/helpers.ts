import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const fixturesDir = join(here, "fixtures");
export const a3Root = join(here, "..", "..", "a3");

export const LOCK_SHA1: Record<string, string> = {
  "tm-order.json": "8c70f083d4aa201bb1d8fc2658ffbe2c730d1c5e",
  "tm-dedup.json": "05bd0b2fb50b2253a7b3c5a793fa0a73749828d4",
  "tm-fold.json": "ee8808d9c1c0a02b264cb7b834f6f8a97e05e80a",
  "truth-vectors.json": "59ce3d78c3cabdeaa5109f0bcf8a3431818e42e9",
  "envelope-rfc8785.json": "616a3ff076f6ed2fbf55bbc2bcd2248767df657b",
  "envelope-payload.json": "205c0f8dce6ddaf2b353ba8c7d82bbe83f2e19c3",
  "envelope-event.json": "0fe78e8baf849562f58f1bae4e6703dc03bfdd78",
  "envelope-hashes.json": "2129d913ad2ffe865e80a98a8a47dd1b00fd5b8b",
  "confidence-vectors.json": "b1816d968b3e9a45b751b45dda3f52ad8086d81c"
};

export const EXPECTED_EVENT_ID =
  "477e868489f5c48d138e4c084e9bf13a40ed66390b964365869f7578dfa2e75a";

export function loadFixture(name: string): string {
  const bytes = readFileSync(join(fixturesDir, name));
  const sha1 = createHash("sha1").update(bytes).digest("hex");
  const expected = LOCK_SHA1[name];
  if (expected && sha1 !== expected) {
    throw new Error(`SHA-1 mismatch for ${name}: ${sha1} != ${expected}`);
  }
  return bytes.toString("utf8");
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
