# Chronicle Timeline v0

## Overview

Chronicle Timeline v0 defines the first timeline-level specification for Chronicle.

The conceptual chain is:

ReceiptOS Proof Object  
→ Chronicle Entry  
→ Chronicle Graph  
→ Chronicle Timeline  
→ Chronicle

In that chain:

- ReceiptOS Proof Object provides immutable proof-bearing truth
- Chronicle Entry provides the smallest Chronicle-native composition unit
- Chronicle Graph provides the relationship layer between Entries
- Chronicle Timeline provides an ordered view over graph-connected Entries
- Chronicle provides the higher-order historical object composed from these layers

Chronicle Timeline is an ordered view over Chronicle Graph.
It does not replace the graph.
It does not verify proofs.
It presents graph-connected Entries as historical continuity.

The Timeline layer exists to make Chronicle legible as history without turning presentation order into proof truth.

## Purpose

Chronicle Timeline v0 explains how Chronicle history can be viewed through:

- chronological order
- milestones
- releases
- handoffs
- reviews
- continuations
- derivations
- project evolution
- agent or human contribution history

The purpose of the Timeline is not to invent a separate historical system.
The purpose of the Timeline is to present already-existing Chronicle data in a coherent, ordered form that humans and renderers can navigate.

Chronicle Graph captures relationship semantics.
Chronicle Timeline captures historical presentation over those relationships.

## Timeline Items

Timeline items are views over Chronicle Entries and Chronicle Graph edges.

A Timeline item is not a new proof object and not a replacement for an Entry or an edge.
It is a presentation-facing Chronicle unit that references existing Chronicle-native structures and places them into an ordered historical sequence.

Chronicle Timeline v0 expects a Timeline item to reference:

- `entry_id`
- optional `edge_id`
- `timestamp` or `chronology_position`
- `relation_type`
- `display_label`
- `metadata`

These are specification-level fields only. This document does not define a schema, implementation format, or renderer-specific contract.

### `entry_id`

**Purpose:**
Identifies the Chronicle Entry being presented in the Timeline.

**Why it matters:**
The Timeline must remain grounded in Chronicle-native source objects rather than inventing detached presentation-only records. `entry_id` ensures each Timeline item points back to an existing Entry.

### `edge_id` (optional)

**Purpose:**
Optionally identifies the Chronicle Graph edge that explains why the Entry appears in a particular historical sequence or ordering context.

**Why it matters:**
Some Timeline items may be understandable from Entry data alone. Others may need a graph relationship to explain continuation, derivation, release, handoff, or milestone placement. Making `edge_id` optional preserves flexibility while keeping the Timeline anchored to the graph when needed.

### `timestamp` or `chronology_position`

**Purpose:**
Provides the ordering signal used to place a Timeline item within historical continuity.

**Why it matters:**
Chronicle history may not always reduce to one universal timestamp. Some cases are best ordered by explicit chronology metadata, some by Entry creation time, and some by graph-contextual ordering. This field makes the ordering basis explicit while keeping it downstream from proof semantics.

### `relation_type`

**Purpose:**
Carries the Chronicle-level relation label that helps explain how the Timeline item participates in continuity.

**Why it matters:**
A Timeline is more useful when it can show not just that something happened, but how it fits into the surrounding historical sequence: continuation, derivation, review, release, milestone, or handoff.

### `display_label`

**Purpose:**
A human-facing label for timeline presentation.

**Why it matters:**
Timeline renderers need a concise, legible way to present an item without forcing renderer-local naming conventions to become the source of truth. `display_label` supports portability and renderer independence while remaining downstream from proof and graph semantics.

### `metadata`

**Purpose:**
An extensible Chronicle-layer metadata container for non-proof, non-canonical contextual information needed for timeline presentation.

Examples may include:

- concise historical notes
- grouping hints
- renderer hints that do not alter truth
- lightweight milestone framing
- optional descriptive context

**Why it matters:**
Timeline presentation often needs context that does not belong in core Entry or Graph semantics. `metadata` provides a place for that context while preserving the hard proof boundary.

## Ordering Model

Chronicle Timeline ordering may use:

- `created_at`
- `chronology_position`
- graph relationships
- explicit metadata

Different Chronicle systems may use one or more of these signals together.

The important architectural rule is that ordering is presentation logic.
It must not mutate Chronicle Entry truth or Chronicle Graph truth.

That means:

- ordering may interpret existing Chronicle data
- ordering may prioritize one historical signal over another for presentation
- ordering must not rewrite Entries
- ordering must not rewrite Graph edges
- ordering must not claim that display order itself proves what happened

Chronicle Timeline is therefore an ordered projection over Chronicle data, not a replacement for the underlying Chronicle layers.

## Proof Boundary

Chronicle Timeline must preserve the proof boundary.

Chronicle Timeline must not:

- modify Proof Objects
- modify Chronicle Entries
- modify Chronicle Graph edges
- redefine proof truth
- replace ReceiptOS verification
- claim verification from display order alone

Timeline only presents already existing Chronicle data.

That means:

- ReceiptOS remains the source of proof truth
- Chronicle Entry remains the source of Chronicle-native unit composition
- Chronicle Graph remains the source of Chronicle relationship semantics
- Chronicle Timeline remains the presentation-facing ordered view over those layers

A clean-looking timeline may be useful, but its narrative clarity must never be confused with proof authority.

## Renderer Independence

Chronicle Timeline v0 is not a UI implementation.

Different renderers may show the same Timeline model as:

- web timeline
- PDF timeline
- Crystal Viewer timeline
- profile history
- project history
- NFT wrapper history

No renderer defines Timeline truth.

A renderer may:

- visualize Timeline ordering
- emphasize milestones or releases
- filter by identity or project context
- package a timeline for portability or publication

A renderer must not:

- redefine Timeline truth
- mutate Entry or Graph meaning through presentation
- become the canonical authority over history ordering
- imply proof authority from formatting alone

The Timeline model must remain renderer-neutral so the same history can travel across surfaces without changing its underlying Chronicle meaning.

## Append-only Model

Chronicle Timeline v0 is designed to be append-only friendly.

New Timeline items appear when new Entries or Graph edges are added.
Existing Entries and Graph edges remain unchanged.

Corrections should be represented by:

- new Entries
- new Graph edges
- new ordering interpretations based on explicit Chronicle data

Corrections should not be represented by silent timeline rewrites that erase prior historical structure.

The Timeline grows because Chronicle history grows.
It should not depend on hidden mutation of prior Chronicle truth.

## Identity and Project Views

Chronicle Timeline can be filtered or projected by:

- person
- AI agent
- organization
- repository
- project
- release
- milestone

These filtered views are projections, not separate proof systems.

This means:

- a person timeline is a view over Chronicle data, not a new source of truth
- a project timeline is a view over Chronicle data, not a separate history ontology
- an agent timeline is a view over Chronicle data, not a replacement for proof or graph structure

Identity and project filtering make Chronicle more navigable, but they must remain downstream from ReceiptOS proof truth and Chronicle Graph relationship truth.

## Future Compatibility

Chronicle Timeline should support future Chronicle systems such as:

- Chronicle Profile
- Chronicle Portfolio
- Chronicle Ownership Wrappers
- public project history pages
- agent contribution history
- release provenance views

The Timeline layer should provide a stable historical projection that these future systems can reuse rather than forcing each one to invent its own incompatible ordering model.

This is important for portability, renderer independence, and long-term coherence across Chronicle surfaces.

## Non-goals

This v0 specification does not include:

- UI implementation
- database implementation
- JSON schema
- TypeScript types
- renderer code
- NFT implementation
- marketplace logic
- ownership transfer logic

It is a docs-first architectural specification for the first timeline-level Chronicle model.

## Short Summary of Design Decisions

- Chronicle Timeline is defined as an ordered view over Chronicle Graph, not a replacement for the Graph.
- The conceptual chain is: ReceiptOS Proof Object → Chronicle Entry → Chronicle Graph → Chronicle Timeline → Chronicle.
- Timeline items are views over existing Chronicle Entries and optional Graph edges.
- Timeline ordering may use timestamps, chronology positions, graph relationships, or explicit metadata, but ordering remains presentation logic.
- The Timeline preserves a hard proof boundary: it does not modify Proof Objects, Entries, or Graph edges, and it does not replace ReceiptOS verification.
- The Timeline is renderer-neutral and should support multiple historical surfaces without letting any renderer define Chronicle truth.
- Filtered identity/project/release/milestone views are projections over Chronicle data, not separate proof systems.
- The Timeline is append-only friendly and should grow through new Entries and Graph edges rather than silent historical rewrites.
