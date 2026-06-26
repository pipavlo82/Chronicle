# Chronicle Entry v0

## Purpose

Chronicle Entry v0 defines the first Chronicle-native object.

A Chronicle Entry is the smallest Chronicle-native composition unit in the Chronicle architecture.

It is not a Proof Object.

Instead, a Chronicle Entry references one or more ReceiptOS Proof Objects and adds Chronicle-level continuity, identity, lineage, and composition metadata above the proof substrate.

This is the core chain:

ReceiptOS Proof Object  
→ Chronicle Entry  
→ Chronicle

In that chain:

- ReceiptOS Proof Object provides immutable proof-bearing truth
- Chronicle Entry provides Chronicle-native historical context and composition
- Chronicle provides the larger longitudinal object built from many Entries

Chronicle Entry therefore exists to bridge immutable proof units and living, appendable histories.

## Design Goals

Chronicle Entry v0 should be:

- composable
- portable
- renderer-neutral
- identity-aware
- proof-preserving
- append-only friendly

### Why these goals matter

#### Composable
A Chronicle Entry must work as a unit that can participate in larger histories, graphs, timelines, and portfolios.

#### Portable
A Chronicle Entry should remain meaningful across systems, repositories, viewers, archival bundles, and future transport layers.

#### Renderer-neutral
No single renderer, wrapper, or presentation surface should define the meaning of the Entry.

#### Identity-aware
A Chronicle Entry should be able to associate proof history with relevant actors and contexts without turning identity into proof.

#### Proof-preserving
A Chronicle Entry must preserve the proof boundary established by ReceiptOS rather than reinterpreting or replacing it.

#### Append-only friendly
A Chronicle Entry should support a growing history model in which new entries extend a Chronicle without rewriting prior entries.

## Chronicle Entry in the Layering Model

Chronicle Entry belongs to the Chronicle layer, not the ReceiptOS layer.

ReceiptOS owns proof generation, proof packaging, verification semantics, and immutable proof-bearing outputs.

Chronicle Entry owns the Chronicle-native concerns that sit above proof, including:

- continuity
- lineage
- relation typing
- historical positioning
- identity association
- project and organization context
- composition into larger Chronicle structures

The architectural boundary is intentional.

If the Entry structure were pushed into the Proof Object, Chronicle would begin to collapse the distinction between proof and history composition. Chronicle Entry exists precisely to prevent that collapse.

## Chronicle Entry Structure

Chronicle Entry v0 proposes the following fields.

These are specification-level fields only. This document does not define a schema, implementation format, or database model.

### `entry_id`

**Purpose:**
A Chronicle-native identifier for the Entry itself.

**Why it belongs at the Chronicle layer:**
The Entry is its own object, separate from the underlying Proof Objects it references. It needs a stable Chronicle-level identity so it can be addressed, grouped, rendered, related, and referenced independently of any single proof unit.

A Proof Object already has its own proof identity. `entry_id` identifies the Chronicle-native compositional unit built above that substrate.

### `proof_object_refs[]`

**Purpose:**
References to one or more ReceiptOS Proof Objects that this Entry incorporates into a Chronicle context.

**Why it belongs at the Chronicle layer:**
The Proof Objects remain immutable and canonical in ReceiptOS. Chronicle Entry does not embed or redefine them. Instead, it references them as upstream truth-bearing units.

This field belongs at the Chronicle layer because Chronicle’s job is to compose over proof objects, not to become one.

### `identity_refs[]`

**Purpose:**
References to identities associated with the Entry.

These may include identities for:

- people
- AI agents
- organizations
- repositories
- projects
- teams or other future identity-bearing entities

**Why it belongs at the Chronicle layer:**
Identity association is a Chronicle concern, not a proof-substrate concern. ReceiptOS proves events and evidence structure. Chronicle relates those verified events to persistent identities and lineages over time.

Identity must remain associative, not proof-defining.

### `project_refs[]`

**Purpose:**
References to one or more projects that provide project-level context for the Entry.

**Why it belongs at the Chronicle layer:**
Projects often span many Proof Objects and many Entries over time. Project grouping is therefore part of higher-order historical composition rather than proof generation itself.

This field enables a Chronicle Entry to participate in larger project-level bodies of work without forcing project semantics into the Proof Object.

### `organization_refs[]`

**Purpose:**
References to one or more organizations associated with the Entry.

**Why it belongs at the Chronicle layer:**
Organizations are part of continuity, stewardship, authorship context, and institutional lineage. Those are Chronicle-layer concerns. They may frame how an Entry participates in a broader history, but they do not define proof truth.

### `relation_type`

**Purpose:**
A Chronicle-level relation label describing the role or historical meaning of the Entry within a larger Chronicle.

**Why it belongs at the Chronicle layer:**
Relation semantics connect entries into legible histories. These are not proof semantics and should not be fused into Proof Objects. ReceiptOS proves what happened. Chronicle interprets how proof-bearing units connect inside a longitudinal history.

### `chronology_position`

**Purpose:**
A field for expressing relative or explicit historical ordering within a Chronicle.

**Why it belongs at the Chronicle layer:**
Chronology in a Chronicle is about historical placement, sequence, and continuity across many Proof Objects and Entries. Proof Objects may contain timestamps or event timing, but Chronicle ordering is a higher-order compositional concern.

This field helps make a Chronicle readable as history rather than as an unstructured bag of proofs.

### `created_at`

**Purpose:**
The creation time of the Chronicle Entry as an Entry object.

**Why it belongs at the Chronicle layer:**
This is not the same as the timing of the underlying proof event. `created_at` records when the Chronicle-native composition unit was created. That matters because proof timing and Chronicle composition timing are related but not identical concepts.

### `metadata`

**Purpose:**
An extensible Chronicle-layer metadata container for contextual information that does not belong in core proof semantics.

Examples may include:

- human-readable framing
- renderer hints that do not alter truth
- continuity notes
- lightweight labels
- non-canonical descriptive context

**Why it belongs at the Chronicle layer:**
Chronicle needs room for compositional and historical context that remains explicitly downstream of proof. This field provides extensibility without forcing every contextual concern into the Proof Object.

The presence of `metadata` must never be used to redefine proof truth.

## Proof Boundary

Chronicle Entry must preserve the Proof Object boundary.

Chronicle Entry must not:

- modify Proof Objects
- redefine proof truth
- replace verification
- mutate receipt semantics

Chronicle Entry only references Proof Objects.

Proof remains owned by ReceiptOS.

That means ReceiptOS remains responsible for:

- canonical proof structure
- evidence normalization
- proof verification
- proof-bearing truth
- receipt semantics

Chronicle Entry remains responsible for Chronicle-native composition and continuity only.

## Relation Types

Chronicle Entry v0 may use relation labels such as:

- `created`
- `verified`
- `reviewed`
- `published`
- `derived_from`
- `continuation_of`
- `milestone`
- `release`
- `handoff`

These examples are illustrative, not final.

They should be understood as an initial vocabulary for expressing historical and compositional relationships between Entries and the broader Chronicle they belong to.

The purpose of `relation_type` is not to replace proof semantics. Its purpose is to make Chronicle history legible, structured, and composable.

Future versions may refine, constrain, extend, or profile these labels for different Chronicle systems.

## Identity Layer

Chronicle Entry may associate history with:

- people
- AI agents
- organizations
- repositories
- projects

It may also support other identity-bearing entities in the future.

The important architectural rule is that identity is not equivalent to proof.

Identity association can help answer questions such as:

- who participated?
- which agent produced or influenced this work?
- what organization or repository does this belong to?
- what larger lineage does this continue?

But identity references do not prove that the underlying event occurred. Proof remains upstream in ReceiptOS.

Chronicle Entry therefore provides identity-aware history without collapsing identity into truth.

## Renderer Independence

All renderers and wrappers must consume the same Chronicle Entry model.

This includes, for example:

- Crystal Viewer
- PDF
- Profile
- NFT wrapper
- future surfaces

No renderer should define Chronicle truth.

A renderer may:

- project an Entry visually
- package an Entry for portability
- expose an Entry for discovery
- wrap an Entry for transport or ownership context

A renderer must not:

- redefine proof truth
- alter the meaning of the Entry’s proof references
- become the canonical authority over the Entry

Chronicle truth must come from the underlying Chronicle Entry model and its upstream Proof Object references, not from a renderer-specific implementation.

## Append-only Model

Chronicle Entry v0 is designed for append-only friendly history.

New Chronicle Entries extend history.
Existing entries remain unchanged.

This means Chronicle should evolve by:

- adding new Entries
- adding new relations
- extending historical continuity
- referencing additional Proof Objects over time

It should not evolve by rewriting existing Entries as the default historical mechanism.

This append-oriented model keeps Chronicle aligned with living provenance while preserving historical legibility and proof integrity.

## Future Compatibility

Future Chronicle systems should build on Chronicle Entry as the first canonical Chronicle-native unit.

This includes potential future systems such as:

- Chronicle Graph
- Chronicle Portfolio
- Chronicle Timeline
- Chronicle Ownership Wrappers

Each of these systems should treat Chronicle Entry as a shared compositional substrate rather than inventing parallel object definitions that fracture Chronicle semantics.

That shared foundation is what makes renderer independence, portability, and long-term composability possible.

## Non-goals

This v0 specification does not include:

- schema implementation
- JSON schema
- TypeScript types
- database design
- NFT implementation
- marketplace logic

It is a docs-first architectural specification for the first Chronicle-native object.

## Short Summary of Design Decisions

- Chronicle Entry is defined as the smallest Chronicle-native object.
- It is explicitly not a Proof Object.
- It references one or more ReceiptOS Proof Objects without modifying them.
- It adds Chronicle-layer continuity, identity, lineage, chronology, and composition metadata.
- It preserves a hard proof boundary: ReceiptOS defines proof truth; Chronicle Entry defines historical composition above that truth.
- It is designed to be renderer-neutral, portable, and append-only friendly.
- Future Chronicle systems should build on Chronicle Entry rather than bypass it.
