// SPDX-License-Identifier: Apache-2.0
// Part of the A3 universe. See LICENSE.
import assert from "node:assert/strict";

type Expect = {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
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

export function expect(actual: unknown): Expect {
  return {
    toBe(expected: unknown) {
      assert.equal(actual, expected);
    },
    toEqual(expected: unknown) {
      assert.deepEqual(actual, expected);
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
