# Chronicle Profile v0

## Overview

Chronicle Profile v0 defines the first identity-facing specification for Chronicle.

The conceptual chain is:

ReceiptOS Proof Object  
→ Chronicle Entry  
→ Chronicle Graph  
→ Chronicle Timeline  
→ Chronicle Profile  
→ Chronicle

In that chain:

- ReceiptOS Proof Object provides immutable proof-bearing truth
- Chronicle Entry provides the smallest Chronicle-native composition unit
- Chronicle Graph provides relationship structure between Entries
- Chronicle Timeline provides ordered historical continuity over graph-connected Entries
- Chronicle Profile provides an identity-facing view over these Chronicle layers
- Chronicle provides the higher-order historical object composed from these structures

Chronicle Profile is an identity-facing view over Entries, Graph, and Timeline.
It does not verify proofs.
It does not create identity proof by itself.
It organizes Chronicle history around a person, AI agent, organization, repository, or project.

The Profile layer exists to make Chronicle history legible around a subject without collapsing attribution, continuity, and identity association into proof truth.

## Purpose

Chronicle Profile should explain how Chronicle can present:

- human contributor history
- AI agent activity history
- organization history
- repository history
- project history
- release history
- stewardship history
- contribution lineage

The purpose of the Profile is not to invent a separate identity system.
The purpose of the Profile is to organize already-existing Chronicle data around a subject so that continuity, attribution, and contribution history can be navigated more clearly.

Chronicle Entry provides the unit.
Chronicle Graph provides the relationship structure.
Chronicle Timeline provides ordered historical continuity.
Chronicle Profile provides the subject-centered projection over those layers.

## Profile Subject

The profile subject is the entity the Profile is organized around.

Illustrative subject types include:

- `person`
- `ai_agent`
- `organization`
- `repository`
- `project`

Chronicle Profile v0 proposes the following subject fields:

- `subject_id`
- `subject_type`
- `display_name`
- `identity_refs[]`
- `project_refs[]`
- `organization_refs[]`
- `metadata`

These are specification-level fields only. This document does not define a schema, implementation format, or external identity standard.

### `subject_id`

**Purpose:**
A Chronicle-level identifier for the subject the Profile is organized around.

**Why it matters:**
The Profile needs a stable subject anchor so multiple Entries, Graph relations, and Timeline projections can be grouped around the same identity-facing view without conflating subject identity with proof identity.

### `subject_type`

**Purpose:**
Identifies the type of subject represented by the Profile.

**Why it matters:**
Chronicle Profiles may organize history around different kinds of entities. Explicitly representing the subject type helps keep the projection legible and prevents renderer-specific assumptions from becoming implicit truth.

### `display_name`

**Purpose:**
A human-facing label for the Profile subject.

**Why it matters:**
Renderers need a concise way to present the Profile subject without inventing their own naming layer as canonical truth. `display_name` supports portability and renderer independence while remaining downstream from proof semantics.

### `identity_refs[]`

**Purpose:**
References to identity records, identifiers, or associated subject references used to connect the Profile to Chronicle Entries and Chronicle history.

**Why it matters:**
Profile organization depends on identity association, but those references must remain explicitly associative rather than proof-defining. `identity_refs[]` makes that layer visible without claiming that identity references alone prove the work or the real-world entity.

### `project_refs[]`

**Purpose:**
References to projects associated with the Profile subject.

**Why it matters:**
A subject-facing Chronicle history often needs to show project participation or project-centered continuity. This field keeps project association available at the Profile layer without pushing project semantics into proof truth.

### `organization_refs[]`

**Purpose:**
References to organizations associated with the Profile subject.

**Why it matters:**
Many Chronicle histories need institutional or stewardship context. `organization_refs[]` allows that association to be represented at the Profile layer without making organization membership equivalent to proof.

### `metadata`

**Purpose:**
An extensible Chronicle-layer metadata container for non-proof, non-canonical contextual information about the Profile subject.

Examples may include:

- concise subject description
- stewardship notes
- grouping hints
- renderer hints that do not alter truth
- optional historical framing

**Why it matters:**
Subject-facing views often need contextual information that does not belong inside Proof Objects, Entries, Graph edges, or Timeline ordering. `metadata` provides room for that context while preserving the hard proof boundary.

## Profile Items

Profile items are projected views over Chronicle Entries, Chronicle Graph edges, and Chronicle Timeline items.

A Profile item is not a new proof object, not a new Entry, and not a replacement for Graph or Timeline truth.
It is a subject-facing Chronicle unit that references already-existing Chronicle data and explains how that data belongs to a particular Profile view.

Chronicle Profile v0 proposes the following item fields:

- `entry_id`
- optional `edge_id`
- optional `timeline_position`
- `relation_type`
- `role`
- `display_label`
- `metadata`

### `entry_id`

**Purpose:**
Identifies the Chronicle Entry represented in the Profile view.

**Why it matters:**
Profile items must remain grounded in Chronicle-native source objects. `entry_id` ensures the Profile remains a projection over actual Chronicle Entries rather than becoming a detached narrative layer.

### `edge_id` (optional)

**Purpose:**
Optionally identifies the Chronicle Graph edge that explains the relationship context for the Profile item.

**Why it matters:**
Some profile projections may need graph context to explain lineage, continuation, derivation, review, release, handoff, or milestone placement. Making `edge_id` optional preserves flexibility while keeping the Profile anchored to Chronicle Graph when needed.

### `timeline_position` (optional)

**Purpose:**
Optionally identifies the Timeline ordering context used to place the item within subject-facing historical continuity.

**Why it matters:**
Profiles often need historical order, but not every item needs a dedicated Timeline position in every renderer. Keeping this optional allows Profiles to incorporate Timeline context without making Timeline ordering mandatory for every projection.

### `relation_type`

**Purpose:**
Carries the Chronicle-level relation label that helps explain how the Profile item participates in the subject’s history.

**Why it matters:**
A Profile is more useful when it can show not just what belongs to the subject, but how that history is connected: continuation, derivation, review, release, milestone, handoff, or other Chronicle-level relation semantics.

### `role`

**Purpose:**
Describes the subject-facing role of the item within the Profile projection.

Examples may include:

- contributor
- reviewer
- steward
- release owner
- agent actor
- project participant

**Why it matters:**
A Profile often needs to distinguish how a subject relates to an Entry, not just that it is associated with it. `role` supports subject-facing interpretation without converting attribution into proof.

### `display_label`

**Purpose:**
A human-facing label for presenting the Profile item.

**Why it matters:**
Different renderers need a portable, concise way to present subject-linked Chronicle items without inventing renderer-local naming conventions as truth.

### `metadata`

**Purpose:**
An extensible Chronicle-layer metadata container for non-proof, non-canonical contextual information about the Profile item.

Examples may include:

- short contribution notes
- grouping hints
- renderer hints that do not alter truth
- optional descriptive context
- subject-facing historical framing

**Why it matters:**
Profile presentation often needs contextual details that do not belong inside core Entry, Graph, or Timeline semantics. `metadata` provides room for that context while preserving the proof boundary.

## Identity Boundary

Chronicle Profile must not:

- prove real-world identity by itself
- equate `identity_refs` with verified identity
- replace external identity systems
- replace ReceiptOS verification
- claim proof from profile association alone

Identity in Profile is association, continuity, attribution context, and indexing.

That means Chronicle Profile may help answer questions such as:

- whose history is this view organized around?
- how is this subject associated with the Chronicle data?
- what contribution lineage or stewardship continuity is being presented?

But it must not claim that profile association alone proves the real-world identity or the truth of the underlying work.

## Proof Boundary

Chronicle Profile must preserve the proof boundary.

Chronicle Profile must not:

- modify Proof Objects
- modify Chronicle Entries
- modify Chronicle Graph edges
- modify Timeline ordering
- redefine proof truth
- replace verification

Profile only presents already existing Chronicle data.

That means:

- ReceiptOS remains the source of proof truth
- Chronicle Entry remains the source of Chronicle-native unit composition
- Chronicle Graph remains the source of Chronicle relationship semantics
- Chronicle Timeline remains the source of ordered historical continuity
- Chronicle Profile remains the subject-facing projection over those layers

A Profile may be compelling and legible, but it must never be mistaken for proof authority.

## Renderer Independence

Chronicle Profile v0 is not a UI implementation.

Different renderers may show the same Profile model as:

- public profile page
- contributor page
- AI agent activity page
- organization page
- project page
- repository history page
- PDF profile
- NFT wrapper profile

No renderer defines Profile truth.

A renderer may:

- visualize subject-linked history
- emphasize milestones, releases, or contribution roles
- filter by project or organization context
- package a Profile for publication or portability

A renderer must not:

- redefine Profile truth
- mutate Entry, Graph, or Timeline meaning through presentation
- claim proof authority from formatting alone
- become the canonical identity authority for the Profile subject

The Profile model must remain renderer-neutral so the same Chronicle history can be presented across surfaces without changing its underlying meaning.

## Append-only Model

Chronicle Profile v0 is designed to be append-only friendly.

New Profile items appear when new Entries, Graph edges, or Timeline projections are added.
Existing underlying Chronicle data remains unchanged.

Corrections should be represented by:

- new Entries
- new Graph edges
- explicit new Profile projections

Corrections should not be represented by silent rewrites that erase prior Chronicle structure.

The Profile grows because Chronicle history grows.
It should not depend on hidden mutation of the underlying Chronicle layers.

## Future Compatibility

Chronicle Profile should support future Chronicle systems such as:

- Chronicle Portfolio
- Chronicle Ownership Wrappers
- public contributor profiles
- AI agent reputation views
- project provenance pages
- organization provenance pages
- release history pages

The Profile layer should provide a stable subject-facing projection that these systems can reuse rather than forcing each one to invent incompatible identity-facing models.

This is important for portability, renderer independence, and long-term coherence across Chronicle surfaces.

## Non-goals

This v0 specification does not include:

- login system
- authentication system
- real-world identity verification
- database implementation
- JSON schema
- TypeScript types
- UI implementation
- renderer code
- NFT implementation
- marketplace logic
- reputation scoring

It is a docs-first architectural specification for the first identity-facing Chronicle model.

## Short Summary of Design Decisions

- Chronicle Profile is defined as an identity-facing view over Chronicle Entries, Graph, and Timeline, not as a proof layer.
- The conceptual chain is: ReceiptOS Proof Object → Chronicle Entry → Chronicle Graph → Chronicle Timeline → Chronicle Profile → Chronicle.
- The Profile subject is the entity the Profile is organized around and can represent people, AI agents, organizations, repositories, or projects.
- Profile items are projections over existing Chronicle data and may reference Entries, optional Graph edges, and optional Timeline positions.
- Identity association remains associative and contextual; it does not become verified identity or proof truth.
- The Profile preserves a hard proof boundary: it does not modify Proof Objects, Entries, Graph edges, or Timeline ordering, and it does not replace ReceiptOS verification.
- The Profile is renderer-neutral and should support multiple public, archival, or wrapper surfaces without letting any renderer define Chronicle truth.
- The Profile is append-only friendly and should grow through new Chronicle data or explicit new projections rather than silent rewrites.
