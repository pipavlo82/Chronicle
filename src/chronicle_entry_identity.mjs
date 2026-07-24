import { stableCanonicalJson } from "./chronicle_position_artifact.mjs"

// Centralized storage-identity handling, applied to every route that
// mutates entryStore (not only /import/receipt).
//
// Reuses the repository's existing canonical JSON implementation
// (stableCanonicalJson, already used for root computation elsewhere in
// Chronicle) for content comparison. Ordinary JSON.stringify is never used
// here: two entries with the same fields in different key order must compare
// equal, and stableCanonicalJson already guarantees that.

export const IDENTITY_RESULT = {
  NEW: "new",
  IDEMPOTENT: "idempotent",
  CONFLICT: "conflict",
}

function canonicalEntryBytes(entry) {
  return stableCanonicalJson(entry)
}

/**
 * Derive the set of identity keys an entry claims, across both the
 * canonical chronicle_entry.v0 shape and the legacy proof_object_refs[]
 * shape. Never compares structured refs by object reference or deep
 * equality: a structured ref's comparison key is its own normative
 * identity field (proof_object_id), not the ref object itself.
 */
export function deriveEntryIdentityKeys(entry) {
  const keys = new Set()
  if (!entry || typeof entry !== "object") return keys

  if (typeof entry.entry_id === "string" && entry.entry_id) {
    keys.add(`entry_id:${entry.entry_id}`)
  }

  // Canonical shape: proof_object_ref is a single normative string.
  if (typeof entry.proof_object_ref === "string" && entry.proof_object_ref) {
    keys.add(`proof_object_ref:${entry.proof_object_ref}`)
  }

  // Legacy shape: proof_object_refs[] is an array of structured refs; the
  // comparison key is each ref's own normative identity field
  // (proof_object_id), never the structured object itself.
  if (Array.isArray(entry.proof_object_refs)) {
    for (const ref of entry.proof_object_refs) {
      if (ref && typeof ref.proof_object_id === "string" && ref.proof_object_id) {
        keys.add(`proof_object_id:${ref.proof_object_id}`)
      }
    }
  }

  return keys
}

/**
 * Find a stored entry sharing any identity key with `candidateEntry`.
 */
export function findIdentityMatch(entryStore, candidateEntry) {
  const candidateKeys = deriveEntryIdentityKeys(candidateEntry)
  if (candidateKeys.size === 0) return null

  return entryStore.find((entry) => {
    const entryKeys = deriveEntryIdentityKeys(entry)
    for (const key of entryKeys) {
      if (candidateKeys.has(key)) return true
    }
    return false
  }) ?? null
}

/**
 * Classify a candidate entry against the current store:
 * - NEW: no identity match, safe to insert.
 * - IDEMPOTENT: identity match with byte-identical canonical content.
 * - CONFLICT: identity match with different canonical content.
 * Never silently discards a conflicting candidate: the caller decides what
 * to do with a CONFLICT result, but this function never returns NEW/IDEMPOTENT
 * for genuinely differing content under the same identity, and never
 * compares object references -- only canonical content and normative
 * identity fields.
 */
export function classifyEntryAdmission(entryStore, candidateEntry) {
  const existing = findIdentityMatch(entryStore, candidateEntry)

  if (!existing) {
    return { result: IDENTITY_RESULT.NEW, existing: null }
  }

  const sameContent = canonicalEntryBytes(existing) === canonicalEntryBytes(candidateEntry)

  return {
    result: sameContent ? IDENTITY_RESULT.IDEMPOTENT : IDENTITY_RESULT.CONFLICT,
    existing,
  }
}
