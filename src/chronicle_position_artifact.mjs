import crypto from "node:crypto"

export const POSITION_ARTIFACT_VERSION_V0 = "chronicle.position_artifact.v0"

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce((accumulator, key) => {
        const nextValue = value[key]
        if (nextValue !== undefined) {
          accumulator[key] = sortJsonValue(nextValue)
        }
        return accumulator
      }, {})
  }

  return value
}

export function stableCanonicalJson(value) {
  return JSON.stringify(sortJsonValue(value))
}

export function normalizePositionArtifactIdentityInput(input) {
  const artifactVersion = typeof input?.artifact_version === "string" && input.artifact_version.trim()
    ? input.artifact_version.trim()
    : POSITION_ARTIFACT_VERSION_V0
  const artifactScope = typeof input?.artifact_scope === "string" && input.artifact_scope.trim()
    ? input.artifact_scope.trim()
    : (typeof input?.scope === "string" && input.scope.trim() ? input.scope.trim() : "position")
  const positionId = typeof input?.position_id === "string" ? input.position_id : ""
  const entryRefs = Array.isArray(input?.entry_refs)
    ? input.entry_refs.filter((value) => typeof value === "string").slice().sort((a, b) => a.localeCompare(b))
    : []
  const receiptRefs = Array.isArray(input?.receipt_refs)
    ? input.receipt_refs.filter((value) => typeof value === "string").slice().sort((a, b) => a.localeCompare(b))
    : []

  return {
    artifact_version: artifactVersion,
    artifact_scope: artifactScope,
    position_id: positionId,
    entry_refs: entryRefs,
    receipt_refs: receiptRefs,
  }
}

export function computeArtifactRootV0(canonicalArtifactIdentityInput) {
  const normalized = normalizePositionArtifactIdentityInput(canonicalArtifactIdentityInput)
  const canonicalJson = stableCanonicalJson(normalized)
  const digest = crypto.createHash("sha256").update(canonicalJson).digest("hex")
  return `sha256:${digest}`
}
