import crypto from "node:crypto"
import { stableCanonicalJson } from "./chronicle_position_artifact.mjs"

export const COLLECTION_VERSION_V0 = "chronicle.collection.v0"

export function normalizeCollectionIdentityInput(input) {
  const collectionVersion = typeof input?.collection_version === "string" && input.collection_version.trim()
    ? input.collection_version.trim()
    : COLLECTION_VERSION_V0
  const collectionId = typeof input?.collection_id === "string" ? input.collection_id : ""
  const artifactRefs = Array.isArray(input?.artifact_refs)
    ? input.artifact_refs.filter((value) => typeof value === "string").slice().sort((a, b) => a.localeCompare(b))
    : []

  return {
    collection_version: collectionVersion,
    collection_id: collectionId,
    artifact_refs: artifactRefs,
  }
}

export function computeCollectionRootV0(canonicalCollectionIdentityInput) {
  const normalized = normalizeCollectionIdentityInput(canonicalCollectionIdentityInput)
  const canonicalJson = stableCanonicalJson(normalized)
  const digest = crypto.createHash("sha256").update(canonicalJson).digest("hex")
  return `sha256:${digest}`
}
