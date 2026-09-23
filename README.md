# a3-ts — A3-EP TypeScript reference

![a3-ts cover](docs/assets/cover.png)

A TypeScript reference implementation of A3-EP v0.2.0 and its canonical lock vectors.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/valeriobitzone-png/a3/blob/main/LICENSE) [![Latest tag](https://img.shields.io/github/v/tag/valeriobitzone-png/a3-ts?sort=semver)](https://github.com/valeriobitzone-png/a3-ts/tags) [![CI](https://github.com/valeriobitzone-png/a3-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/valeriobitzone-png/a3-ts/actions/workflows/ci.yml)

## What it is

A TypeScript implementation with JCS serialization, CloudEvents, temporal ordering, truth, confidence, attestation validation, and lock-vector v2 support.

## What it is NOT

It is not a UI renderer, not implementation code copied from another language, and not evidence that a downstream deployment is production-ready.

## Status

- **VERIFIED:** lock-vector and conformance tests, v1 parse compatibility, v2 canonical output, CF-001 over the shared receipt forms (`receipt ≠ fact`, INT-010), and CF-004 (INT-008). CF-002, CF-003, CF-005 and CF-007..CF-009 are covered by the truth, confidence, temporal and envelope laws, but the category fixtures are not yet judged one by one; CF-006 has no category judge.
- **UNVERIFIED:** physical deployment and third-party adoption.

## Quickstart

### Get it

```bash
git clone https://github.com/valeriobitzone-png/a3-ts.git
cd a3-ts
# Requirements: Node.js >=20 and pnpm.
git clone https://github.com/valeriobitzone-png/a3.git ../a3
git -C ../a3 checkout closeout-v1.0
pnpm install
```

### Prove it

```bash
pnpm typecheck
pnpm test
```

### Integrate it

Use the tests as a template for an implementation in another language. Read `../a3/spec/SPEC_A3-EP.md`, keep `../a3` at `closeout-v1.0`, and compare canonical bytes to the shared vectors. Do not copy implementation code.

## Architecture

`src/` contains protocol modules; `test/` contains lock and integration tests; the pinned `../a3` checkout supplies the normative specification and shared fixtures.

## Testing & conformance

CI runs typecheck and the full test suite with a frozen pnpm lockfile. Canonical output is compared against declared SHA-256 vectors.

## Family

- [a3](https://github.com/valeriobitzone-png/a3) — normative specs and Kotlin implementation
- [a3-go](https://github.com/valeriobitzone-png/a3-go) — Go reference implementation
- [a3ui-web](https://github.com/valeriobitzone-png/a3ui-web) — Web Components renderer
- [a3ui-cli](https://github.com/valeriobitzone-png/a3ui-cli) — textual Python renderer
- [a3ui-graphics](https://github.com/valeriobitzone-png/a3ui-graphics) — renderer-neutral graphics tokens

## Contributing

Follow the family contribution rules, retain provenance, and update tests before changing protocol behavior.

## License

Implementation code is Apache-2.0. The governing specification and schemas are CC BY 4.0 in the pinned A3 repository.

## Provenance

Measured: test output, canonical bytes, and SHA-256 comparisons. Behavior beyond the declared corpus and downstream production use remain unverified.
