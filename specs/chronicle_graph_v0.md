# Chronicle Graph v0

## Overview

Chronicle Graph v0 defines the first graph-level relationship layer for Chronicle.

Chronicle Graph is a relationship layer over Chronicle Entries.

Its role is to connect Chronicle Entries into coherent, legible, and portable histories without changing the proof substrate or mutating the Entry objects it organizes.

The conceptual chain is:

ReceiptOS Proof Object  
→ Chronicle Entry  
→ Chronicle Graph  
→ Chronicle

In that chain:

- ReceiptOS Proof Object provides immutable proof-bearing truth
- Chronicle Entry provides the smallest Chronicle-native composition unit
- Chronicle Graph provides the relationship layer that connects Entries into meaningful continuity
- Chronicle provides the higher-order historical object composed from Entries and their graph relationships

Chronicle Graph does not verify proofs.

It organizes Chronicle Entries into meaningful continuity.

## Purpose

Chronicle Graph should define how Chronicle Entries relate through:

- lineage
- continuation
- derivation
- authorship context
- project context
- release context
- handoff context
- milestone context

The purpose of the graph is not to create new proof truth.
The purpose of the graph is to make historical structure explicit.

Chronicle Entry gives Chronicle its first native unit.
Chronicle Graph gives Chronicle a canonical way to connect those units into histories that can be navigated, rendered, analyzed, and extended over time.

## Chronicle Graph in the Layering Model

Chronicle Graph belongs to the Chronicle layer.

It sits above Chronicle Entries and below larger Chronicle views or assembled Chronicle objects.

That relationship can be understood as:

- ReceiptOS owns proof truth
- Chronicle Entry owns Chronicle-native composition at the smallest unit level
- Chronicle Graph owns the explicit relationships between Chronicle Entries
- Chronicle owns the larger historical object assembled from those connected units

This layering matters because graph meaning is not proof meaning.

A graph edge may explain how two Entries relate historically, operationally, or contextually, but it does not replace the proof boundary established upstream by ReceiptOS.

## Graph Nodes

In Chronicle Graph v0, graph nodes are Chronicle Entries.

A node must reference an existing Chronicle Entry.

The graph must not mutate Entry contents.

This means Chronicle Graph does not create a parallel node ontology divorced from Chronicle Entry. Instead, it treats Chronicle Entry as the canonical graph node substrate.

### Node principle

- node identity comes from an existing Chronicle Entry
- graph participation does not rewrite the Entry
- graph structure is layered over the Entry rather than embedded as mutable proof-like state inside it

This keeps the system consistent: Chronicle Entry remains the smallest Chronicle-native object, and Chronicle Graph remains the relationship layer over those objects.

## Graph Edges

Graph edges are relationships between Chronicle Entries.

An edge expresses a Chronicle-level relationship from one Entry to another Entry.

Chronicle Graph v0 proposes the following edge fields.

These are specification-level fields only. This document does not define a schema, implementation format, or graph database model.

### `edge_id`

**Purpose:**
A Chronicle-native identifier for the edge itself.

**Why it matters:**
Relationships should be addressable and durable in their own right. If graph edges are part of a long-lived continuity model, they need stable identity so they can be rendered, referenced, indexed, and extended over time.

### `from_entry_id`

**Purpose:**
The Chronicle Entry identifier where the relationship originates.

**Why it matters:**
A graph edge needs a clear directional source so chronology, derivation, handoff, and continuity can be expressed explicitly rather than inferred ambiguously.

### `to_entry_id`

**Purpose:**
The Chronicle Entry identifier where the relationship points.

**Why it matters:**
A graph edge needs a clear directional destination so graph-based meaning can be traversed, interpreted, and rendered consistently across systems.

### `relation_type`

**Purpose:**
A Chronicle-level label describing the type of relationship between the source Entry and the destination Entry.

**Why it matters:**
Graph edges are not useful if they are only generic links. `relation_type` gives historical and compositional meaning to the connection while remaining downstream from proof semantics.

This is how the graph expresses continuity, derivation, review, publication, release, handoff, and other Chronicle-native forms of connection.

### `created_at`

**Purpose:**
The creation time of the graph edge as an edge object.

**Why it matters:**
The time at which a relationship is asserted in Chronicle may differ from the underlying proof event times and from the creation times of the Entries themselves. The graph layer therefore needs its own creation timing for relationship history.

### `metadata`

**Purpose:**
An extensible Chronicle-layer metadata container for non-proof, non-canonical contextual information about the relationship.

Examples may include:

- descriptive labels
- continuity notes
- renderer hints that do not alter truth
- relation commentary
- lightweight contextual framing

**Why it matters:**
Graph relationships may need contextual expression without forcing every nuance into fixed core fields. `metadata` allows that flexibility while preserving the hard proof boundary.

The presence of `metadata` must never be used to redefine proof truth or mutate Entry meaning.

## Relation Types

Chronicle Graph v0 may use illustrative relation labels such as:

- `derived_from`
- `continuation_of`
- `supersedes`
- `references`
- `verifies`
- `reviews`
- `publishes`
- `releases`
- `hands_off_to`
- `milestone_for`

This list is illustrative, not final.

These labels are intended as an initial vocabulary for making Chronicle history explicit and navigable.

### Interpretation guidance

- `derived_from` may indicate that one Entry builds on the output or context of another
- `continuation_of` may indicate longitudinal continuation across a shared history
- `supersedes` may indicate that a later Entry becomes the preferred continuation point without erasing the earlier one
- `references` may indicate contextual linkage without stronger historical inheritance
- `verifies` may indicate that one Entry contributes Chronicle-level verification context around another Entry, without replacing ReceiptOS verification
- `reviews` may indicate review or assessment relationship
- `publishes` may indicate publication relationship
- `releases` may indicate release relationship
- `hands_off_to` may indicate stewardship or execution transfer relationship
- `milestone_for` may indicate that an Entry marks a milestone inside a broader history

Future Chronicle systems may refine, constrain, extend, or profile relation types for particular use cases.

## Proof Boundary

Chronicle Graph must preserve the proof boundary.

Chronicle Graph must not:

- modify Proof Objects
- modify Chronicle Entries
- redefine proof truth
- replace ReceiptOS verification
- claim verification by graph relationship alone

The graph organizes history.
It does not create proof.

That means:

- Proof Objects remain upstream truth-bearing units governed by ReceiptOS
- Chronicle Entries remain stable Chronicle-native units that reference proof
- graph edges express Chronicle-level relationship semantics only

Even when an edge uses a label like `verifies` or `reviews`, the graph itself must not be treated as a replacement proof engine.

## Append-only Model

Chronicle Graph v0 is designed to be append-only friendly.

New graph edges may extend the graph.
Existing entries and existing edges should remain stable.

Corrections should be represented by:

- new entries
- new edges
- new relation paths
- explicit supersession or continuation relationships

Corrections should not be represented by silent mutation as the default historical mechanism.

This keeps Chronicle aligned with living provenance: the graph grows as history grows, while prior historical structure remains legible.

## Renderer Independence

Timeline, Profile, Crystal Viewer, PDF, NFT wrappers, and future renderers should consume the same Chronicle Graph model.

No renderer defines the graph truth.

A renderer may:

- visualize graph structure
- project graph relationships into a timeline
- package graph-linked history for portability
- expose graph-linked discovery surfaces
- wrap graph-connected objects for transport or ownership context

A renderer must not:

- redefine graph semantics
- replace the canonical graph model with renderer-local truth
- alter proof meaning through presentation
- become the authority over Chronicle relationship truth

Chronicle Graph truth should come from the Chronicle Graph model itself and its linked Chronicle Entries, not from any single viewer, profile page, PDF, wallet surface, or wrapper.

## Future Compatibility

Chronicle Graph should support future Chronicle systems such as:

- Chronicle Timeline
- Chronicle Portfolio
- Chronicle Profile
- Chronicle Ownership Wrappers
- project histories
- agent histories
- organization histories

The graph is the canonical relationship layer that can power these future systems without forcing each one to invent its own incompatible continuity model.

That shared graph substrate is what enables portability, renderer independence, and long-term composability across Chronicle surfaces.

## Non-goals

This v0 specification does not include:

- database implementation
- graph database choice
- JSON schema
- TypeScript types
- UI
- renderer logic
- NFT implementation
- marketplace logic

It is a docs-first architectural specification for the first graph-level Chronicle relationship model.

## Short Summary of Design Decisions

- Chronicle Graph is defined as a relationship layer over Chronicle Entries.
- The conceptual chain is: ReceiptOS Proof Object → Chronicle Entry → Chronicle Graph → Chronicle.
- Graph nodes are Chronicle Entries; the graph does not mutate Entry contents.
- Graph edges connect Entries using Chronicle-level relation semantics.
- Edge fields are defined at the specification level as `edge_id`, `from_entry_id`, `to_entry_id`, `relation_type`, `created_at`, and `metadata`.
- The graph preserves a hard proof boundary: it does not modify Proof Objects, does not modify Entries, does not replace verification, and does not create proof truth.
- The graph is append-only friendly: new edges extend history, while prior edges and Entries remain stable.
- Future Chronicle systems should consume the same graph model rather than inventing parallel relationship layers.
