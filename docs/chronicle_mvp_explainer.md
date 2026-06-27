# Chronicle MVP Explainer

## What Chronicle is

Chronicle is a continuity layer for proof-bearing work.

ReceiptOS proves what happened.
Chronicle explains how proven events become history.

Chronicle exists downstream of proof.
It does not replace proof generation, verification, or proof truth.
It organizes proof-bearing work into connected, ordered, readable continuity.

## What Chronicle is not

Chronicle MVP is not:

- a verifier
- an ownership system
- an identity system
- an NFT system
- a marketplace
- a reputation system
- a replacement for ReceiptOS

The MVP is intentionally narrow.
Its job is to prove that Chronicle can turn proof-bearing work into Chronicle-native historical continuity.

## Chronicle and ReceiptOS

The Chronicle MVP relationship to ReceiptOS is simple:

- ReceiptOS proves what happened
- Chronicle explains how proven events become history

ReceiptOS remains responsible for:

- proof generation
- evidence normalization
- verification semantics
- canonical proof truth

Chronicle MVP adds:

- Chronicle Entry
- Chronicle Graph
- Chronicle Timeline
- human-readable historical output

The Chronicle MVP flow is:

ReceiptOS Proof Object  
→ Chronicle Entry  
→ Chronicle Graph  
→ Chronicle Timeline  
→ Human-readable Output

## Why Timeline is the MVP view layer

Timeline is the MVP view layer because it is the thinnest, clearest projection over Chronicle Graph.

It proves the Chronicle thesis with minimal conceptual sprawl:

- proof-bearing work can become Chronicle Entries
- Entries can be connected with Graph relationships
- Graph-connected history can be rendered as ordered continuity

Timeline is easier to reason about than higher-order layers such as:

- Profile
- Portfolio
- Release View
- Ownership Wrappers

Those layers may still be valuable later, but the MVP should first prove continuity itself.

## Scope boundaries

Chronicle MVP does not replace ReceiptOS verification.
Chronicle MVP does not modify proof objects.
Chronicle MVP does not define ownership, identity, NFT, marketplace, or reputation logic.

This boundary matters because the rendered output is not proof truth.
It is a readable projection over already-existing Chronicle and ReceiptOS data.

## Diagram note

The Chronicle MVP diagram uses a few short labels for readability.

These should be read as illustrative labels, not final vocabulary contracts.
In particular:

- `Truth Source` is shorthand for the ReceiptOS proof-bearing source object and should not be read as a new formal object type
- relationship labels in the diagram should be treated as examples and not as the complete or final Chronicle Graph vocabulary
- the final authority remains the written specs for Chronicle Entry, Graph, Timeline, and MVP scope

## Out of scope for MVP

The following remain intentionally out of scope for Chronicle MVP:

- Profile
- Portfolio
- Release View
- Ownership Wrappers
- NFT integrations
- marketplace logic
- identity systems
- reputation systems
- UI frameworks beyond simple readability

## Summary

Chronicle MVP is the smallest useful system that proves this idea:

proof-bearing work can become connected history without replacing proof truth.

That is why the first Chronicle MVP is:

ReceiptOS Proof Object  
→ Chronicle Entry  
→ Chronicle Graph  
→ Chronicle Timeline  
→ Human-readable Output
