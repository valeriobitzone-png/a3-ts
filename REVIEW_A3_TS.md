# REVIEW_A3_TS

AUDIT-FIRST. Protocollo: FASE A3-TS — seconda implementazione di riferimento in TypeScript, da spec, non da traduzione Kotlin. Repo sibling `a3-ts`. Runtime: zero dipendenze npm (solo `node:crypto` per SHA-256). JCS reimplementato da RFC 8785. Tag `a3-ts-v0.1` solo a gate verde.

**Contratto:** gli stessi lock JSON di `:core:temporal`, `:core:truth`, `:core:envelope`, `:core:confidence` sono il confine. TS legge i REVIEW + RFC 8785 + CloudEvents 1.0. I file lock sono fixture, non sorgente Kotlin.

---

## Toolchain

| Voce | Valore |
|------|--------|
| Package manager | pnpm |
| Linguaggio | TypeScript `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` |
| Test | vitest (`pnpm test`) |
| Typecheck | `pnpm typecheck` |
| Runtime deps | nessuna (`package.json` senza `dependencies`) |
| pnpm 11 | `allowBuilds.esbuild: true` solo per il postinstall di vitest/vite; non è una dipendenza runtime |
| Hash | `node:crypto` SHA-256 / SHA-1 |
| JCS | `src/jcs.ts` da RFC 8785 (nessuna libreria terza) |

---

## SHA-1 lock (verificati all'import dei fixture)

| File | SHA-1 |
|------|-------|
| `tm-order.json` | `8c70f083d4aa201bb1d8fc2658ffbe2c730d1c5e` |
| `tm-dedup.json` | `05bd0b2fb50b2253a7b3c5a793fa0a73749828d4` |
| `tm-fold.json` | `ee8808d9c1c0a02b264cb7b834f6f8a97e05e80a` |
| `truth-vectors.json` | `59ce3d78c3cabdeaa5109f0bcf8a3431818e42e9` |
| `envelope-rfc8785.json` | `616a3ff076f6ed2fbf55bbc2bcd2248767df657b` |
| `envelope-payload.json` | `205c0f8dce6ddaf2b353ba8c7d82bbe83f2e19c3` |
| `envelope-event.json` | `0fe78e8baf849562f58f1bae4e6703dc03bfdd78` |
| `envelope-hashes.json` | `2129d913ad2ffe865e80a98a8a47dd1b00fd5b8b` |
| `confidence-vectors.json` | `b1816d968b3e9a45b751b45dda3f52ad8086d81c` |

Mismatch SHA-1 all'import → il test abortisce prima delle asserzioni.

`event.id` atteso (e ottenuto): `477e868489f5c48d138e4c084e9bf13a40ed66390b964365869f7578dfa2e75a`

---

## Tabella audit — INT-001..007

| Test | Invariante | Percorso | Negativo | PASS |
|------|------------|----------|----------|------|
| INT-001 | JCS RFC 8785 appendix A | input RFC → byte identici a `envelope-rfc8785.json`; chiavi ordinate, no spazi | numero non finito → `JcsReject` | **PASS** |
| INT-002 | envelope lock | JCS(payload)=payload lock; `id`=SHA-256 hex; event lock; hashes lock | id ≠ fingerprint → `EnvelopeReject` | **PASS** |
| INT-003 | temporal order/dedup/fold | `tm-order` / `tm-dedup` / `tm-fold` byte-identici; fold commutativo su 24 permutazioni | `t_observe < t_event` / `t_admit < t_observe` → `TemporalReject` | **PASS** |
| INT-004 | truth TR-001..006 | `truth-vectors.json` byte-identico; promote solo HYPOTHESIS+REAL; receipt≠FACT | parse senza classe/provenance; FACT da sandbox; HYPOTHESIS believed → `TruthReject` | **PASS** |
| INT-005 | confidence scores | min pesato, decay diadico, corroboration, mapping identici al lock | dimensione mancante / range → `ConfidenceReject` | **PASS** (score); vedi divergenza recency |
| INT-006 | round-trip envelope | payload lock → pack TS → byte identici a `envelope-event.json`; JCS RFC = lock | — | **PASS** |
| INT-007 | indipendenza | `git diff` / `git status --porcelain` di `/Users/ambrogio/Desktop/a3` vuoti; nessuna runtime dep | — | **PASS** |

Gate:

```
pnpm test
pnpm typecheck
```

---

## Divergenza dichiarata (non riconciliata)

**Campo:** `recency.fixture_10799s` e `fixture.vector.recency` in `confidence-vectors.json`.

| Origine | Valore JSON | binary64 |
|---------|-------------|----------|
| Spec `2^(-(10799)/21600)`, arrotondato a binary64 nearest-even | `0.7071294727113612` | `0x1.6a0cdfceaa81bp-1` |
| Lock Kotlin (Java `Math.pow`) | `0.7071294727113613` | `0x1.6a0cdfceaa81cp-1` |

Il valore esatto è `0.707129472711361202…`. L'arrotondamento IEEE-754 corretto è il double TS/CPython. Il lock Kotlin è **1 ULP sopra**.

**Bug:** implementazione Kotlin/Java (`2.0.pow`), non TS. TS usa l'esponenziazione ECMAScript sulla formula del REVIEW, senza copiare il double del lock.

**Score:** identici lo stesso (`0.565703578169089`) perché `recency × 0.8` cade sullo stesso double da entrambi i vicini ULP. INT-005 verifica gli score, i mapping, la corroboration e i decay diadici (0 / ½ / 2× / 4×) byte-per-byte; asserisce esplicitamente la coppia ULP invece di forzare i byte del recency fixture.

Nessun altro campo dei lock diverge.

---

## Cosa non è stato fatto

- Nessuna traduzione del sorgente Kotlin.
- Nessuna libreria JCS di terze parti.
- Nessun tocco al repo `a3`.
- Nessun push prima del tag `a3-ts-v0.1`.
