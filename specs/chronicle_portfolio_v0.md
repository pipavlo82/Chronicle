# Chronicle Portfolio v0

## Overview

Chronicle Portfolio v0 defines the first collection-level specification for Chronicle.

The conceptual chain is:

ReceiptOS Proof Object  
→ Chronicle Entry  
→ Chronicle Graph  
→ Chronicle Timeline  
→ Chronicle Profile  
→ Chronicle Portfolio  
→ Chronicle

In that chain:

- ReceiptOS Proof Object provides immutable proof-bearing truth
- Chronicle Entry provides the smallest Chronicle-native composition unit
- Chronicle Graph provides relationship structure between Entries
- Chronicle Timeline provides ordered historical continuity over graph-connected Entries
- Chronicle Profile provides identity-facing views over Chronicle history
- Chronicle Portfolio provides a collection-level view over these Chronicle layers
- Chronicle provides the higher-order historical object composed from these structures

Chronicle Portfolio is a collection-level view over Chronicle Entries, Graphs, Timelines, and Profiles.

It does not verify proofs.
It does not create ownership.
It does not replace Profile or Timeline.
It organizes related Chronicle history into a coherent body of work.

The Portfolio layer exists to make Chronicle legible as a curated body of work without turning grouping, inclusion, or presentation into proof truth or ownership authority.

## Purpose

Chronicle Portfolio should explain how Chronicle can group:

- projects
- releases
- milestones
- research history
- open-source contributions
- AI agent work
- human contributor work
- organization work
- repository histories
- product histories

The purpose of the Portfolio is not to invent a separate proof or ownership system.
The purpose of the Portfolio is to organize already-existing Chronicle data into a coherent collection so related work can be understood together.

Chronicle Entry provides the unit.
Chronicle Graph provides the relationship structure.
Chronicle Timeline provides ordered continuity.
Chronicle Profile provides identity-facing projection.
Chronicle Portfolio provides collection-level grouping over those Chronicle layers.

## Portfolio Subject

The portfolio subject is the entity or scope the Portfolio represents.

Illustrative subject types include:

- `person`
- `ai_agent`
- `organization`
- `project`
- `repository`
- `product`
- `research_area`

Chronicle Portfolio v0 proposes the following subject fields:

- `portfolio_id`
- `subject_id`
- `subject_type`
- `display_name`
- `profile_refs[]`
- `entry_refs[]`
- `graph_refs[]`
- `timeline_refs[]`
- `project_refs[]`
- `organization_refs[]`
- `metadata`

These are specification-level fields only. This document does not define a schema, implementation format, ownership contract, or database model.

### `portfolio_id`

**Purpose:**
A Chronicle-level identifier for the Portfolio itself.

**Why it matters:**
The Portfolio is its own Chronicle-native collection object. It needs a stable identifier so it can be referenced, rendered, grouped, and carried across surfaces independently of any single Entry, Graph, Timeline, or Profile.

### `subject_id`

**Purpose:**
Identifies the entity or scope the Portfolio is organized around.

**Why it matters:**
A Portfolio must have a clear organizing anchor. `subject_id` connects the collection to a subject or scope without making that subject identical to proof truth or ownership authority.

### `subject_type`

**Purpose:**
Identifies what kind of subject or scope the Portfolio represents.

**Why it matters:**
Chronicle Portfolios may represent people, AI agents, organizations, repositories, products, or research domains. Making the subject type explicit helps preserve renderer independence and avoids hidden assumptions about what kind of collection is being presented.

### `display_name`

**Purpose:**
A human-facing label for the Portfolio subject or collection.

**Why it matters:**
Renderers need a concise way to present the Portfolio without inventing their own naming layer as canonical truth. `display_name` keeps the collection portable and legible across surfaces.

### `profile_refs[]`

**Purpose:**
References to Profiles associated with the Portfolio.

**Why it matters:**
Some Portfolios will be organized around one or more identity-facing projections. `profile_refs[]` allows the Portfolio to include or relate to those views without collapsing Profile semantics into collection truth.

### `entry_refs[]`

**Purpose:**
References to Chronicle Entries included in the Portfolio.

**Why it matters:**
The Portfolio ultimately needs to remain grounded in Chronicle-native source units. `entry_refs[]` ensures the collection remains tied to actual Chronicle Entries rather than becoming a detached narrative surface.

### `graph_refs[]`

**Purpose:**
References to Chronicle Graph edges or graph-linked relationships relevant to the Portfolio.

**Why it matters:**
Collections often need relationship context to explain how included work fits together. `graph_refs[]` allows relationship structure to travel with the Portfolio without making the Portfolio itself the source of graph truth.

### `timeline_refs[]`

**Purpose:**
References to Timeline projections relevant to the Portfolio.

**Why it matters:**
Many bodies of work are best understood in sequence. `timeline_refs[]` allows the Portfolio to incorporate historical ordering context while keeping Timeline semantics separate from collection semantics.

### `project_refs[]`

**Purpose:**
References to projects associated with the Portfolio.

**Why it matters:**
Portfolios often need project context, especially when grouping work across multiple Entries, releases, and milestones. This field keeps project association explicit without pushing project meaning into proof truth.

### `organization_refs[]`

**Purpose:**
References to organizations associated with the Portfolio.

**Why it matters:**
Many bodies of work need institutional or stewardship context. `organization_refs[]` allows that association to be represented at the Portfolio layer without making institutional affiliation equivalent to proof or ownership.

### `metadata`

**Purpose:**
An extensible Chronicle-layer metadata container for non-proof, non-canonical contextual information about the Portfolio.

Examples may include:

- collection framing notes
- grouping hints
- renderer hints that do not alter truth
- optional curation context
- descriptive collection summaries

**Why it matters:**
Collection-level views often need contextual information that does not belong inside Proof Objects, Entries, Graphs, Timelines, or Profiles. `metadata` provides room for that context while preserving the hard proof boundary.

## Portfolio Items

Portfolio items are references to existing Chronicle data.

A Portfolio item is not a new proof object, not a replacement for an Entry, and not a replacement for Graph, Timeline, or Profile truth.
It is a collection-facing Chronicle unit that references already-existing Chronicle structures and explains how those structures belong to a particular body of work.

Chronicle Portfolio v0 proposes the following item fields:

- `item_id`
- `item_type`
- `entry_id`
- optional `profile_id`
- optional `timeline_position`
- optional `graph_ref`
- `relation_type`
- `display_label`
- `metadata`

### `item_id`

**Purpose:**
A Chronicle-level identifier for the Portfolio item itself.

**Why it matters:**
Portfolio items need stable addressability within a collection so they can be referenced, rendered, grouped, or updated through explicit curation rather than implicit mutation.

### `item_type`

**Purpose:**
Identifies the type of Chronicle data the Portfolio item is primarily representing.

Examples may include:

- entry
- profile
- timeline
- graph-linked collection item

**Why it matters:**
A Portfolio may contain mixed collection semantics across multiple Chronicle layers. `item_type` helps keep that mixture explicit and renderer-neutral.

### `entry_id`

**Purpose:**
Identifies the Chronicle Entry represented by the Portfolio item.

**Why it matters:**
The Portfolio must remain grounded in Chronicle-native source units. `entry_id` ensures the collection continues to point back to actual Chronicle Entries rather than becoming a detached curation layer.

### `profile_id` (optional)

**Purpose:**
Optionally identifies the Profile context associated with the Portfolio item.

**Why it matters:**
Some collection items may need identity-facing projection context to explain why they belong in a particular body of work. Keeping this optional preserves flexibility without forcing all collection items to depend on Profile semantics.

### `timeline_position` (optional)

**Purpose:**
Optionally identifies the Timeline ordering context for the Portfolio item.

**Why it matters:**
Portfolios often need to present work historically, but not every item requires an explicit Timeline position in every renderer. Keeping this optional allows historical context without making Timeline ordering mandatory for all collection items.

### `graph_ref` (optional)

**Purpose:**
Optionally references the Graph relationship context associated with the Portfolio item.

**Why it matters:**
Some collection items are easier to understand when their relationship structure is visible, such as continuations, derivations, reviews, releases, or handoffs. `graph_ref` allows that context to travel with the item while keeping graph truth upstream.

### `relation_type`

**Purpose:**
Carries the Chronicle-level relation label that helps explain how the Portfolio item participates in the body of work.

**Why it matters:**
A Portfolio is more useful when it can show not just what is included, but how included work fits together: continuation, derivation, milestone, release, contribution lineage, or stewardship relationship.

### `display_label`

**Purpose:**
A human-facing label for presenting the Portfolio item.

**Why it matters:**
Different renderers need a concise, portable way to present collection items without inventing renderer-local naming conventions as the source of truth.

### `metadata`

**Purpose:**
An extensible Chronicle-layer metadata container for non-proof, non-canonical contextual information about the Portfolio item.

Examples may include:

- short curation notes
- grouping hints
- renderer hints that do not alter truth
- optional collection framing
- descriptive context about why the item belongs in the Portfolio

**Why it matters:**
Collection-level presentation often needs contextual details that do not belong inside core Entry, Graph, Timeline, or Profile semantics. `metadata` provides room for that context while preserving the proof boundary.

## Collection Boundary

Chronicle Portfolio must not:

- modify Proof Objects
- modify Chronicle Entries
- modify Graph edges
- modify Timeline ordering
- modify Profile identity context
- redefine proof truth
- create ownership by itself
- claim verification from inclusion alone

Portfolio inclusion is curation, grouping, and presentation context.

That means a Portfolio may say:

- this work belongs together
- these Entries form a body of work
- this collection highlights a project, release, milestone, research area, or contributor history

But it must not say:

- inclusion proves ownership
- inclusion proves truth
- inclusion creates verification authority

## Proof Boundary

Portfolio only references already existing Chronicle data.
ReceiptOS remains responsible for proof generation and verification.
Chronicle Entries remain the smallest Chronicle-native objects.

That means:

- ReceiptOS remains the source of proof truth
- Chronicle Entry remains the source of Chronicle-native unit composition
- Chronicle Graph remains the source of Chronicle relationship semantics
- Chronicle Timeline remains the source of ordered historical continuity
- Chronicle Profile remains the source of identity-facing projection
- Chronicle Portfolio remains the source of collection-level grouping only

A compelling Portfolio may make work easier to understand, but it must never be mistaken for proof generation, proof verification, or ownership authority.

## Renderer Independence

Chronicle Portfolio v0 is not a UI implementation.

Different renderers may show the same Portfolio model as:

- public portfolio page
- contributor portfolio
- AI agent portfolio
- organization portfolio
- project portfolio
- research portfolio
- PDF portfolio
- NFT wrapper portfolio

No renderer defines Portfolio truth.

A renderer may:

- visualize the collection
- emphasize milestones, releases, or contribution groupings
- filter by project, organization, or subject type
- package a Portfolio for publication or portability

A renderer must not:

- redefine Portfolio truth
- mutate Entry, Graph, Timeline, or Profile meaning through presentation
- claim proof authority from formatting alone
- become the canonical ownership authority for the collection

The Portfolio model must remain renderer-neutral so the same body of work can be carried across surfaces without changing its underlying Chronicle meaning.

## Append-only Model

Chronicle Portfolio v0 is designed to be append-only friendly.

New Portfolio items may be added over time.
Existing underlying Chronicle data remains unchanged.

Corrections should be represented by:

- new Entries
- new Graph edges
- new Timeline projections
- new Profile projections
- explicit Portfolio updates

Corrections should not be represented by silent rewrites that erase prior Chronicle structure.

The Portfolio grows because Chronicle history grows and collection context evolves.
It should not depend on hidden mutation of the underlying Chronicle layers.

## Future Compatibility

Chronicle Portfolio should support future:

- Chronicle Ownership Wrappers
- public project pages
- agent reputation views
- contributor reputation views
- organization provenance pages
- research provenance pages
- release provenance views

The Portfolio layer should provide a stable collection-facing projection that these future systems can reuse rather than forcing each one to invent incompatible grouping models.

This is important for portability, renderer independence, and long-term coherence across Chronicle surfaces.

## Non-goals

This v0 specification does not include:

- ownership transfer logic
- NFT implementation
- marketplace logic
- reputation scoring
- ranking algorithm
- database implementation
- JSON schema
- TypeScript types
- UI implementation
- renderer code

It is a docs-first architectural specification for the first collection-level Chronicle model.

## Short Summary of Design Decisions

- Chronicle Portfolio is defined as a collection-level view over Chronicle Entries, Graphs, Timelines, and Profiles, not as a proof or ownership layer.
- The conceptual chain is: ReceiptOS Proof Object → Chronicle Entry → Chronicle Graph → Chronicle Timeline → Chronicle Profile → Chronicle Portfolio → Chronicle.
- The Portfolio subject is the entity or scope the collection is organized around and can represent people, AI agents, organizations, projects, repositories, products, or research areas.
- Portfolio items are references to already-existing Chronicle data and may incorporate Entry, optional Profile, optional Timeline, and optional Graph context.
- Portfolio inclusion is curation, grouping, and presentation context only; it does not create ownership or verification authority.
- The Portfolio preserves a hard proof boundary: it does not modify Proof Objects, Entries, Graph edges, Timeline ordering, or Profile identity context, and it does not redefine proof truth.
- The Portfolio is renderer-neutral and should support multiple public, archival, wrapper, and research-facing surfaces without letting any renderer define Chronicle truth.
- The Portfolio is append-only friendly and should grow through new Chronicle data or explicit Portfolio updates rather than silent rewrites.
