# REVIEW_A3_TS

AUDIT-FIRST. Protocollo: FASE A3-TS-REBASE — seconda implementazione TypeScript sui lock v2 (`io.a3ep.*` + attestation). Repo sibling `a3-ts`. Frozen: repo `a3` (zero diff). Niente push su `a3`. Tag `a3-ts-v0.2` solo a gate verde; push solo `a3-ts`.

**Contratto:** valida contro A3-EP v0.2.0 con lock v2. Parser accetta `a3.*` e normalizza a `io.a3ep.*`. Output v2 emette solo `io.a3ep.*`. `attestation` obbligatorio sui payload lock v2; assente in v1 → nessuna validazione attester. CF-004: `attester_id = requester_id` su `io.a3ep.action.authorized` → reject.

---

## Toolchain

| Voce | Valore |
|------|--------|
| Package manager | pnpm |
| Linguaggio | TypeScript `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` |
| Test | `node --test` (`pnpm test`) |
| Typecheck | `pnpm typecheck` |
| Runtime deps | nessuna (`package.json` senza `dependencies`) |
| Hash | `node:crypto` SHA-256 |
| JCS | `src/jcs.ts` da RFC 8785 (nessuna libreria terza) |
| Spec | A3-EP v0.2.0 lock v2 |

---

## Identità lock

| Lock | `event_id` = SHA-256(JCS(payload)) |
|------|------------------------------------|
| v1 (backward parse) | `477e868489f5c48d138e4c084e9bf13a40ed66390b964365869f7578dfa2e75a` |
| v2 | `1fec213fbaf6d420cf9ff95c51c022c4cdfb1f43fabcf82647e03c03f92f2b7b` |

v2 `type` = `io.a3ep.belief.admitted`. v2 attestation = `{attester_id: urn:a3:party:attester, requester_id: urn:a3:party:requester}`.

---

## SHA-256 lock v2 (verificati all'import dei fixture)

| File | SHA-256 |
|------|---------|
| `tm-order.json` | `e805711fc39d48a59b47bfdd147737016db56a3a68511f27229e769691378a6e` |
| `tm-dedup.json` | `b6b05fefb45b1f9ff2fc882d16eb5a1f0b1cf96e6d8455070836d472e333e0ba` |
| `tm-fold.json` | `f80b9b513fc928d11e8aceb66a29d7cfb7540a0bb8451c9017630b105602e9f5` |
| `truth-vectors.json` | `1ddb48779a470fd65adc59a5e0245767f07bd4ea91ad70b7c3e10afbdebab5d6` |
| `envelope-rfc8785.json` | `2d5e01a318d0f0879ab568c4be289c8b1f64ef8921a53c6277d5e069978baacb` |
| `envelope-payload.json` | `1fec213fbaf6d420cf9ff95c51c022c4cdfb1f43fabcf82647e03c03f92f2b7b` |
| `envelope-event.json` | `fa6e007a23751ad55c22291b64982f0d7c8287eb5723b446a3a5fd72c470e939` |
| `envelope-hashes.json` | `d27e67f05719b77daeb14a4d219a87cb332998fe2c6d163571f35e7b90d76ff5` |
| `confidence-vectors.json` | `25efbc9f1b3730658c34502f2564d18a8aad04c1ee202b672be4b020917fddee` |

Mismatch SHA-256 all'import → il test abortisce prima delle asserzioni. Manifest: `test/fixtures/vector-sha256.json`.

---

## Esecuzione

```
node --test --test-reporter=spec test/*.test.ts
pnpm test
```

---

## Tabella audit — INT-001..009

| Test | Invariante | Percorso | PASS |
|------|------------|----------|------|
| INT-001 | JCS RFC 8785 appendix A byte-identico | `envelope-rfc8785.json` | **PASS** |
| INT-002 | envelope lock v2; `id` = `1fec213f…2f2b7b`; type `io.a3ep.*` | pack da payload v2 (input type `a3.*` normalizzato) | **PASS** |
| INT-003 | tm-order/dedup/fold identici ai lock v2 | 24 permutazioni | **PASS** |
| INT-004 | truth-vectors v2 | `truth-vectors.json` | **PASS** |
| INT-005 | confidence-vectors v2; score identici; recency IEEE-754 nearest-even | `serialize(corpus) === lock` | **PASS** |
| INT-006 | TS serializza envelope v2 = byte Kotlin v2 | `encodeEvent` = `envelope-event.json` | **PASS** |
| INT-007 | parse v1 `a3.*` → `io.a3ep.*`; no crash; attestation assente | `test/fixtures/v1/envelope-event.json` | **PASS** |
| INT-008 | CF-004 `attester_id = requester_id` su `io.a3ep.action.authorized` → reject | `pack` + `EnvelopeReject` | **PASS** |
| INT-009 | freeze repo a3: `git diff` / porcelain vuoti | `/Users/ambrogio/Desktop/a3` | **PASS** |

Gate: **verde**. Tag locale `a3-ts-v0.2`. Push solo `a3-ts`. Repo `a3` non toccato.

---

## Recency

Lock v2 `fixture_10799s` = `0.7071294727113612` (IEEE-754 nearest-even). Il corpus TS collide sui byte del lock Kotlin v2. La divergenza 1 ULP dichiarata in `a3-ts-v0.1` è chiusa sul lock, non da un workaround TS.

---

## Vietato (rispettato)

- Nessuna modifica al repo `a3`.
- Backward compat v1 non rimosso (`test/fixtures/v1/`).
- Nessun `a3.*` in output v2.
- Nessun attester = requester silenzioso su irreversibile.
- Nessun push su `a3`.
