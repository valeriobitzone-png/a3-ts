# a3-ts

TypeScript reference implementation of A3-EP. Validates against **A3-EP v0.2.0 with lock v2**.

Lock files are copies of `a3/conformance/vectors/v2/` (SHA-256). Lock v1 envelopes used only for parse backward-compat live in `test/fixtures/v1/`.

## Run

```
node --test --test-reporter=spec test/*.test.ts
pnpm test
pnpm typecheck
```

`pnpm test` is `node --test` on the INT files. Zero runtime `dependencies`. JCS is RFC 8785 in `src/jcs.ts`. SHA-256 is `node:crypto`.

## Lock v2

| Field | Value |
|-------|--------|
| `type` | `io.a3ep.belief.admitted` |
| `event_id` | `1fec213fbaf6d420cf9ff95c51c022c4cdfb1f43fabcf82647e03c03f92f2b7b` |
| attestation | `attester_id` ≠ `requester_id` (`urn:a3:party:attester` / `urn:a3:party:requester`) |

Parser accepts lock v1 `a3.*` types and normalizes to `io.a3ep.*`. Output MUST NOT emit `a3.*`. CF-004: `attester_id = requester_id` on `io.a3ep.action.authorized` is an explicit reject.
