// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
import assert from "node:assert/strict";

type Expect = {
  toBe(expected: unknown): void;
  toBeCloseTo(expected: number, digits?: number): void;
  toEqual(expected: unknown): void;
  toEqualClose(expected: unknown, digits?: number): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toHaveLength(n: number): void;
  toThrow(expected?: unknown): void;
  toThrowError(expected?: unknown): void;
  not: {
    toBe(expected: unknown): void;
  };
};

function threw(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

function matchThrow(err: unknown, expected: unknown): void {
  assert.notEqual(err, undefined, "expected function to throw");
  if (expected === undefined) return;
  if (typeof expected === "function") {
    const Ctor = expected as new (...args: unknown[]) => object;
    assert.ok(err instanceof Ctor);
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (expected instanceof RegExp) {
    assert.match(message, expected);
    return;
  }
  if (typeof expected === "string") {
    assert.ok(message.includes(expected), `${message} does not include ${expected}`);
  }
}

function assertDeepClose(
  actual: unknown,
  expected: unknown,
  digits: number,
  path: string
): void {
  const tolerance = 0.5 * 10 ** -digits;
  if (typeof actual === "number" && typeof expected === "number") {
    const delta = Math.abs(actual - expected);
    assert.ok(
      Number.isFinite(delta) && delta < tolerance,
      `${path}: ${actual} is not close to ${expected} (|delta|=${delta}, tolerance 10^-${digits})`
    );
    return;
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    assert.ok(
      Array.isArray(actual) && Array.isArray(expected),
      `${path}: array shape mismatch`
    );
    const a = actual as unknown[];
    const e = expected as unknown[];
    assert.equal(
      a.length,
      e.length,
      `${path}: array length ${a.length} != ${e.length}`
    );
    a.forEach((value, index) =>
      assertDeepClose(value, e[index], digits, `${path}[${index}]`)
    );
    return;
  }
  if (
    actual !== null &&
    expected !== null &&
    typeof actual === "object" &&
    typeof expected === "object"
  ) {
    const a = actual as Record<string, unknown>;
    const e = expected as Record<string, unknown>;
    const actualKeys = Object.keys(a).sort();
    const expectedKeys = Object.keys(e).sort();
    assert.deepEqual(actualKeys, expectedKeys, `${path}: key sets differ`);
    for (const key of actualKeys) {
      assertDeepClose(a[key], e[key], digits, `${path}.${key}`);
    }
    return;
  }
  assert.deepEqual(actual, expected, `${path}: values differ`);
}

export function expect(actual: unknown): Expect {
  return {
    toBe(expected: unknown) {
      assert.equal(actual, expected);
    },
    toBeCloseTo(expected: number, digits = 2) {
      const tolerance = 0.5 * 10 ** -digits;
      assert.ok(
        typeof actual === "number" &&
          Math.abs((actual as number) - expected) < tolerance,
        `expected ${String(actual)} to be close to ${expected} within 10^-${digits}`
      );
    },
    toEqual(expected: unknown) {
      assert.deepEqual(actual, expected);
    },
    toEqualClose(expected: unknown, digits = 10) {
      assertDeepClose(actual, expected, digits, "$");
    },
    toBeUndefined() {
      assert.equal(actual, undefined);
    },
    toBeDefined() {
      assert.notEqual(actual, undefined);
    },
    toHaveLength(n: number) {
      assert.ok(actual !== null && typeof actual === "object" && "length" in actual);
      assert.equal((actual as { length: number }).length, n);
    },
    toThrow(expected?: unknown) {
      assert.equal(typeof actual, "function");
      matchThrow(threw(actual as () => unknown), expected);
    },
    toThrowError(expected?: unknown) {
      assert.equal(typeof actual, "function");
      matchThrow(threw(actual as () => unknown), expected);
    },
    not: {
      toBe(expected: unknown) {
        assert.notEqual(actual, expected);
      }
    }
  };
}
