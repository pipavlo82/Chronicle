# Ecosystem E2E Demo v0

## Goal

Show a minimal end-to-end documentation demo of the ecosystem handoff:

```text
Stealth → ReceiptOS → Chronicle
```

or

```text
Execution → Proof → History
```

This document is a conceptual demo path.
It does not define a new protocol, a new object standard, or a new API contract.

## Layer roles

- **Stealth** executes.
- **ReceiptOS** proves.
- **Chronicle** records history.

## Scope

This document is docs-only.
It does not introduce:
- code changes
- schema redesign
- API redesign
- new roots
- scoring
- ownership or NFT logic

## Minimal object path

### 1. Stealth captures execution evidence

Stealth is the execution layer.
It captures execution evidence from agent, tool, and action workflows.

The evidence may include execution context such as:
- task or action context
- authorization context
- tool/action trace
- execution results
- evidence records suitable for downstream proof derivation

At this layer, the output is execution evidence.
Stealth is not yet the canonical proof layer.

### 2. ReceiptOS consumes that evidence

Crystal Receipt / ReceiptOS is the proof layer.
It consumes execution evidence produced upstream.

Its role is to normalize the evidence into a stable proof boundary rather than to re-run execution.

### 3. ReceiptOS derives `receipt_root`

ReceiptOS derives a canonical `receipt_root` from the normalized evidence.

This is the proof identity layer for the captured execution evidence.
ReceiptOS remains the canonical proof layer for this step.

### 4. ReceiptOS produces proof-facing artifacts

From the normalized evidence and derived `receipt_root`, ReceiptOS produces:

- **Evidence Capsule**
- **Provenance Summary**
- **portable proof object**

These outputs remain proof-facing artifacts.
They do not become the history layer by themselves.

### 5. Chronicle imports the portable proof object

Chronicle is the history layer.
It consumes the portable proof object downstream.

Chronicle does not become the proof engine and does not redefine proof truth.
It composes continuity and durable historical meaning above the imported proof object.

### 6. Chronicle composes durable history around it

From the imported proof object, Chronicle composes durable history and continuity across its current object stack:

- **Entry**
- **Artifact**
- **Collection**
- **Portfolio**

Position remains part of the Chronicle model, but currently has no canonical root.

Chronicle's role here is not to verify again, score the work, or create ownership semantics.
Its role is to record, compose, and preserve continuity above proof objects.

## Conceptual end-to-end summary

```text
Stealth captures execution evidence
→ ReceiptOS derives receipt_root and emits proof artifacts
→ Chronicle imports the portable proof object
→ Chronicle composes durable history
```

## Boundary reminder

- **Stealth** = execution
- **ReceiptOS** = proof
- **Chronicle** = history

This boundary is the point of the ecosystem split.
Execution, proof, and history remain distinct responsibilities even when they are part of one end-to-end workflow.
