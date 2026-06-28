# Ecosystem Handoff v0

## Purpose

Define the preferred object flow across the ecosystem.
The goal is to make repository boundaries explicit and reduce ambiguity around execution, proof, and history responsibilities.

## Ecosystem Layers

- **Stealth** = Execution Layer
- **Crystal Receipt / ReceiptOS** = Proof Layer
- **Chronicle** = History Layer

## High-Level Flow

```text
Execution → Proof → History
```

or

```text
Stealth → ReceiptOS → Chronicle
```

## Stealth → ReceiptOS

Stealth captures execution evidence from agent, tool, and action workflows.

Stealth is responsible for:
- execution
- authorization context
- evidence capture
- receipt-facing UX

Stealth is not the canonical proof substrate.

The preferred downstream handoff is execution evidence suitable for proof derivation.

## ReceiptOS Proof Layer

Crystal Receipt / ReceiptOS consumes execution evidence and derives portable proof objects.

Responsibilities include:
- `receipt_root` derivation
- Evidence Capsule generation
- Provenance Summary generation
- proof packaging
- producer-neutral proof boundaries

ReceiptOS is the canonical proof layer.
ReceiptOS is not the execution runtime and is not the history layer.

## ReceiptOS → Chronicle

The preferred downstream handoff is a portable proof object.

Chronicle consumes portable proof objects as inputs.
Chronicle does not become the proof engine and does not recompute proof truth.

## Chronicle History Layer

Chronicle composes durable history and continuity above proof objects.

Current object stack:
- Entry
- Position *(no root yet)*
- Artifact (`artifact_root`)
- Collection (`collection_root`)
- Portfolio (`portfolio_root`)

Chronicle focuses on continuity, composition, and recomputable identity layers.

## Boundary Rules

- **Stealth**:
  - executes
  - captures evidence
- **ReceiptOS**:
  - proves
  - packages proof objects
- **Chronicle**:
  - composes history

## Non-Goals

- scoring
- reputation systems
- ownership logic
- NFT logic
- marketplace logic
- new proof semantics
- execution runtime inside Chronicle
- history layer inside ReceiptOS

## Example Path

1. Stealth captures execution evidence.
2. ReceiptOS derives `receipt_root` and produces a portable proof object.
3. Chronicle imports the portable proof object and composes durable history around it.
