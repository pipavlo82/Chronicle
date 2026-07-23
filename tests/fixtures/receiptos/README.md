# ReceiptOS fixture provenance

These four fixtures back the Chronicle-side ReceiptOS admission tests
(`tests/chronicle_receiptos_root.test.mjs`, `tests/chronicle_receiptos_admission.test.mjs`,
`tests/chronicle_receiptos_ingress.test.mjs`). None of them are fetched or
imported from crystal-receipt at runtime -- they are static, pre-generated
JSON committed to this repository.

- **Source repository:** `pipavlo82/crystal-receipt`
- **Source commit:** `1f86b74b7ae0bc6b8762c077053d5b0eae192f04` (`fix: gate Chronicle entries on recomputed receipts (#112)`)

| File | Origin | Source path in crystal-receipt @ `1f86b74b` | SHA-256 |
|---|---|---|---|
| `session-evidence.sample.json` | **copied verbatim** | `src/receiptos/fixtures/session-evidence.sample.json` | `cec193767e3309c213da84ee37b47d94d7e500b206063e1f4a7a46def6f628a6` |
| `session-evidence.tampered.sample.json` | **copied verbatim** | `src/receiptos/fixtures/session-evidence.tampered.sample.json` | `409cdbc10ebd3472933fb4754ac07f768d912e9ea2641a0ab75d4d1dc128294b` |
| `portable-proof-object.sample.json` | **generated** -- no such fixture is committed in crystal-receipt; this is the real, unmodified JSON output of crystal-receipt's own `createPortableProofObjectV0(evidence)` (from `src/receiptos/capsule/portable-proof-object-v0.ts`) run once against `session-evidence.sample.json`, via an ephemeral script created, run, and deleted in a read-only pass over crystal-receipt (crystal-receipt's tracked files were never modified) | derived from `session-evidence.sample.json` via `createPortableProofObjectV0` | `be0207056b43d6930ccf89d88942eaf409d05afd38bd05d28af8d6b7b292adf5` |
| `portable-proof-object.tampered.sample.json` | **generated**, same method, against `session-evidence.tampered.sample.json` | derived from `session-evidence.tampered.sample.json` via `createPortableProofObjectV0` | `905fc05bee1e4922abe1496f2822bd38ca701f1fece2e1a247151ec85cadaa49` |

The two `session-evidence.*` copies were verified byte-identical to their
crystal-receipt source (same SHA-256 on both sides) before being committed
here.

The independent recomputation parity claim in `chronicle_receiptos_root.mjs`
was verified against these exact fixture bytes: recomputing
`session-evidence.sample.json` yields `0x687dc5c0...4171a6bc` (matches the
fixture's own `anchor.receipt_root`, i.e. clean), and recomputing
`session-evidence.tampered.sample.json` yields `0x1c0b2bbc...79ba570`
(differs from its stored `anchor.receipt_root`, i.e. mismatch) --
byte-identical to what crystal-receipt's own `computeReceiptRoot` produced
for the same bytes.

Re-verify any of the above at any time with:

```sh
certutil -hashfile tests/fixtures/receiptos/<file> SHA256
```
