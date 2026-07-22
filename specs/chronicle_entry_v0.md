# Chronicle Entry v0

## Purpose

Chronicle Entry v0 defines the canonical Chronicle-owned entry object for binding
Chronicle history to an upstream ReceiptOS proof boundary without redefining
that proof boundary.

A Chronicle Entry is not a ReceiptOS proof object.
It is a Chronicle-layer historical/compositional object that references an
upstream ReceiptOS portable proof object and preserves the upstream
`receipt_root` as ReceiptOS-owned identity.

Core chain:

ReceiptOS evidence
→ `receiptos.portable_proof_object.v0`
→ `chronicle_entry.v0`
→ higher Chronicle aggregates

Chronicle Entry exists to preserve the distinction between:

- ReceiptOS proof identity and verification; and
- Chronicle-native entry identity, continuity, ordering, and aggregation.

## Canonical Chronicle Entry v0 wire shape

The canonical Chronicle Entry v0 top-level fields are exactly:

- `schema`
- `entry_id`
- `source_system`
- `receipt_root`
- `proof_object_ref`
- `evidence_capsule_ref`
- `provenance_summary_ref`
- `created_from`
- `labels`
- `notes`

The canonical Chronicle Entry v0 top-level fields are exactly the ten fields
listed above. No other top-level field is part of the canonical v0 wire shape.

`schema` MUST equal `chronicle_entry.v0`.

Every canonical v0 entry contains singular `proof_object_ref`.
Every canonical v0 entry contains separate `receipt_root`.
`proof_object_refs[]` is not the canonical Chronicle Entry v0 wire shape.
Multiple proofs MUST NOT be silently represented by restoring the old plural
field.
Aggregation of multiple proof objects belongs to a higher Chronicle aggregate
layer or a future schema version.

## Current constructor behavior and field contract

This amendment pins the current concrete constructor behavior shared by the live
ReceiptOS Chronicle export path.

The current implemented top-level behavior is:

- `schema`: required string; exactly `chronicle_entry.v0`
- `entry_id`: required string
- `source_system`: required string
- `receipt_root`: required string
- `proof_object_ref`: required string
- `evidence_capsule_ref`: required string
- `provenance_summary_ref`: required string
- `created_from`: required; string or `null`
- `labels`: required array of strings
- `notes`: required; string or `null`

`entry_id` defaulting to `entry-<proof_object_id>` is current constructor
behavior only.
It is not defined here as a content-addressed root or new cryptographic
identity.

## Status of fields from the earlier MVP proposal

The earlier high-level Chronicle Entry and MVP model also used fields that are
not part of the canonical chronicle_entry.v0 top-level wire shape.

Their status is:

- proof_object_refs[] is a legacy MVP field. Canonical v0 replaces that
 plural entry field with singular proof_object_ref plus separate
 receipt_root.
- project_refs[], relation_type, and created_at are not Chronicle Entry
 v0 top-level fields. Where present in the current ReceiptOS export path,
 those values remain properties of the referenced
 receiptos.portable_proof_object.v0; Chronicle Entry v0 does not duplicate
 them.
- identity_refs[], organization_refs[], chronology_position, and
 metadata are legacy MVP entry fields with no canonical v0 top-level
 counterpart.
- Migration, projection, or placement of legacy fields into higher Chronicle
 artifacts requires a separate versioned follow-up.

Absence of these legacy fields from chronicle_entry.v0 MUST NOT be interpreted
as loss of upstream ReceiptOS evidence. The referenced portable proof object
remains the source of ReceiptOS-owned proof and export data.

## Portable proof object boundary

A Chronicle Entry v0 created from ReceiptOS evidence MUST first consume a
conforming portable proof object whose schema is
`receiptos.portable_proof_object.v0`.

Portable-proof-object conformance and Chronicle field-binding consistency do
not by themselves establish ReceiptOS proof validity. ReceiptOS verification
remains ReceiptOS-owned.
Conforming object shape is not a validity verdict.
Chronicle field binding is not ReceiptOS verification.
Chronicle MUST NOT promote object availability or schema conformance into a
valid ReceiptOS verdict.

The required relations are:

```text
entry.proof_object_ref = portable_proof_object.proof_ref
entry.receipt_root = portable_proof_object.receipt_root
entry.source_system = portable_proof_object.proof_system
```

Use the exact current constructor relations from the live ReceiptOS Chronicle
export path.

The current canonical constructor behavior is:

```text
entry.evidence_capsule_ref = embedded:<proof_object_id>:evidence_capsule
entry.provenance_summary_ref = embedded:<proof_object_id>:provenance_summary
entry.created_from = portable_proof_object.source_evidence_ref
```

`labels` defaults to an empty array.
`notes` defaults to `null`.

## Current `proof_object_id` and `proof_ref` construction

The current implemented export relation is exactly:

```text
proof_object_id = "proofobj-" + receipt_root with the leading "0x" removed
proof_ref = "receiptos://portable-proof-object/" + proof_object_id
```

`proof_ref` is a deterministic ReceiptOS URI.
It is not currently a content hash of the complete portable proof object.
This amendment does not change its syntax or derivation.
Changing it to a content-addressed reference requires a future version.

## Direct root collapse is forbidden

`entry.proof_object_ref` MUST NOT equal `entry.receipt_root`.
This is a semantic requirement even though both fields are strings.

`receipt_root` is the ReceiptOS proof identity.
`proof_object_ref` identifies the portable proof object carrying that proof.
Assigning the capsule root directly to `proof_object_ref` is non-conformant.
A bare `receipt_root` is insufficient to resolve the full portable proof
object.
The portable proof object carries the evidence capsule, provenance summary,
replay and anchor references, producer information, source evidence reference,
and export metadata.

This amendment does not claim that `proof_ref` cryptographically commits to
every byte of the portable proof object.

## Root-layer separation

The following layers are distinct.

### ReceiptOS `receipt_root`

ReceiptOS-owned.
Identifies the recomputable ReceiptOS proof boundary.

### `proof_object_id`

ReceiptOS export-layer identifier.
Currently derived from `receipt_root`.

### `proof_ref`

Reference to `receiptos.portable_proof_object.v0`.
Stored as Chronicle `proof_object_ref`.

### Chronicle `entry_id`

Chronicle-owned entry identifier.
Not a ReceiptOS root.
Current constructor behavior may derive it from `proof_object_id`, but it is
not a newly defined content hash.

### Chronicle aggregate roots

Chronicle-owned.
Computed only under their own artifact contracts.

Equality between these layers is not required.
Equality MUST NOT be assumed.
Chronicle does not replace ReceiptOS identity with Chronicle identity.
Chronicle does not recompute a new value and call it `receipt_root`.

## Verification responsibility

Chronicle preserves and references `receipt_root`.
Chronicle does not redefine ReceiptOS canonicalization.
Chronicle does not reinterpret ReceiptOS validity.
Chronicle does not score, certify, sign, or create ownership.
Chronicle may verify that entry fields bind consistently to the referenced
portable proof object.
ReceiptOS verification remains ReceiptOS-owned.
Chronicle computes only Chronicle-owned entry identities, aggregate roots,
ordering, and continuity relations.

History records facts. Reputation interprets them.

Chronicle Entry v0 does not introduce:

- verdict fields
- scoring fields
- reputation fields
- ownership fields
- NFT logic

## Legacy plural model status

The older Chronicle MVP model using `proof_object_refs[]` is legacy.
It is not the canonical `chronicle_entry.v0` wire shape after this amendment.
Canonical v0 uses singular `proof_object_ref` plus separate `receipt_root`.
Multiple proof objects MUST NOT be represented by restoring the plural field.
Multi-proof aggregation belongs to a higher Chronicle aggregate layer or a
future schema version.
Migration of legacy implementation and examples is a separate follow-up.

This branch does not modify the legacy implementation.

## Unresolved seams intentionally preserved

This amendment does not invent rules for:

- a cryptographic `entry_id`
- content-addressing the complete Chronicle Entry
- replacing `proof_ref` with SHA-256
- multiple proof objects inside one entry
- retrieval transport
- storage location
- signatures
- ownership
- NFT logic
- reputation
- scoring

The portable-proof-object boundary itself is normative and is not deferred.

## Chronicle versus ReceiptOS boundary

ReceiptOS owns:

- proof generation
- canonical proof structure
- evidence normalization
- proof verification
- receipt semantics
- `receipt_root`
- portable proof object production

Chronicle owns:

- `entry_id`
- entry-level field binding
- Chronicle-native ordering
- Chronicle-native continuity
- Chronicle-native aggregate roots
- historical composition above the proof layer

Chronicle Entry therefore preserves the proof boundary established by ReceiptOS
rather than reinterpreting or replacing it.

## Re-import and identity-conflict semantics

The current v0 identity chain derives `proof_object_id` and the default
`entry_id` from `receipt_root`.
Those identifiers bind the ReceiptOS proof boundary. They do not commit to
every byte of the `receiptos.portable_proof_object.v0` envelope.
For a Chronicle importer or store:

- The first accepted portable proof object for a given `proof_object_id`
 establishes the local binding between that identity and the exact
 portable-object byte sequence accepted by the importer.
- A later import with the same `proof_object_id` MAY be treated as idempotent
 only when its portable-object bytes are byte-for-byte identical to the
 previously accepted byte sequence.
- The same `proof_object_id` with non-identical portable-object bytes is an
 identity conflict.
- An identity conflict MUST be surfaced explicitly. The importer MUST NOT
 overwrite, merge, refresh, replace, update in place, or silently deduplicate
 the previously accepted portable object.
- The same derived or supplied `entry_id` bound to a non-byte-identical
 portable object is also an identity conflict and MUST NOT overwrite the
 existing Chronicle entry.
- If the importer does not retain the previously accepted exact byte sequence,
 or otherwise cannot establish exact byte identity, it MUST NOT claim an
 idempotent re-import. It MUST fail closed as an identity conflict.
- An identity conflict is a Chronicle import or storage outcome. It does not
 alter the ReceiptOS `receipt_root`, does not invalidate or validate the
 ReceiptOS proof, and does not reinterpret a ReceiptOS verifier verdict.
- Identity-conflict state is not a field of `chronicle_entry.v0`.

Chronicle Entry v0 defines no semantic JSON-equivalence rule and no canonical
whole-envelope digest for `receiptos.portable_proof_object.v0`.
Changing from exact byte identity to canonical-content equivalence, adding a
portable-object digest, permitting update-in-place behavior, or treating
distinct envelopes as equivalent requires a separate versioned contract.
