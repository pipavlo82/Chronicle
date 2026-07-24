import fs from "node:fs"
import path from "node:path"
import http from "node:http"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createChronicleTimeline } from "../src/chronicle_mvp_timeline_generator_core.mjs"
import { POSITION_ARTIFACT_VERSION_V0, computeArtifactRootV0 } from "../src/chronicle_position_artifact.mjs"
import { COLLECTION_VERSION_V0, computeCollectionRootV0 } from "../src/chronicle_collection.mjs"
import { PORTFOLIO_VERSION_V0, computePortfolioRootV0 } from "../src/chronicle_portfolio.mjs"
import { admitReceiptOSChronicleEntryV0, ReceiptOSAdmissionError } from "../src/chronicle_receiptos_admission.mjs"
import { classifyEntryAdmission, IDENTITY_RESULT } from "../src/chronicle_entry_identity.mjs"

const PORT = 8080
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// CHRONICLE_STORE_PATH lets callers (tests) point the store at an isolated
// temporary file instead of the tracked repository data file. Default
// production behavior is unchanged: data/chronicle-local-store.json.
const STORE_PATH = process.env.CHRONICLE_STORE_PATH
  ? path.resolve(process.env.CHRONICLE_STORE_PATH)
  : path.resolve(__dirname, "../data/chronicle-local-store.json")
const DATA_DIR = path.dirname(STORE_PATH)

/** @type {import('../src/chronicle_mvp_data_model.ts').ChronicleEntry[]} */
const entryStore = []

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadStore() {
  ensureDataDir()

  if (!fs.existsSync(STORE_PATH)) {
    entryStore.splice(0, entryStore.length)
    return
  }

  const raw = fs.readFileSync(STORE_PATH, "utf8")
  const parsed = raw ? JSON.parse(raw) : { entries: [] }
  const entries = Array.isArray(parsed.entries) ? parsed.entries : []

  entryStore.splice(0, entryStore.length, ...entries)
}

function saveStore() {
  ensureDataDir()
  fs.writeFileSync(STORE_PATH, JSON.stringify({ entries: entryStore }, null, 2) + "\n", "utf8")
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" })
  response.end(JSON.stringify(payload, null, 2))
}

function text(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "text/markdown; charset=utf-8" })
  response.end(payload)
}

function html(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "text/html; charset=utf-8" })
  response.end(payload)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = ""

    request.on("data", (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"))
        request.destroy()
      }
    })

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })

    request.on("error", reject)
  })
}

function isValidProofObjectRef(ref) {
  return (
    ref &&
    typeof ref === "object" &&
    typeof ref.proof_object_id === "string" &&
    typeof ref.proof_system === "string"
  )
}

function isValidChronicleEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.entry_id === "string" &&
    Array.isArray(entry.proof_object_refs) &&
    entry.proof_object_refs.length > 0 &&
    entry.proof_object_refs.every(isValidProofObjectRef) &&
    typeof entry.created_at === "string"
  )
}

// A submission is "ReceiptOS-backed" when it claims a ReceiptOS-verified
// identity, whether via the canonical chronicle_entry.v0 shape or the legacy
// proof_object_refs[] shape. Such a claim can only be admitted through the
// independent-recomputation boundary (admitReceiptOSChronicleEntryV0); no
// route may accept it on shape validity alone.
//
// Detection MUST NOT depend solely on the self-declared, spoofable
// source_system/proof_system marker fields: a caller could omit or alter
// those while leaving the structural ReceiptOS fingerprints (the
// receiptos:// proof_ref URI scheme, the proofobj- identity prefix, or the
// canonical chronicle_entry.v0 schema literal itself) intact.
const RECEIPTOS_PROOF_REF_PATTERN = /^receiptos:\/\/portable-proof-object\//
const RECEIPTOS_PROOF_OBJECT_ID_PATTERN = /^proofobj-/

function looksReceiptOSBackedRef(ref) {
  if (!ref || typeof ref !== "object") return false
  if (ref.proof_system === "ReceiptOS") return true
  if (typeof ref.proof_ref === "string" && RECEIPTOS_PROOF_REF_PATTERN.test(ref.proof_ref)) return true
  if (typeof ref.proof_object_id === "string" && RECEIPTOS_PROOF_OBJECT_ID_PATTERN.test(ref.proof_object_id)) return true
  return false
}

function isReceiptOSBackedEntrySubmission(entry) {
  if (!entry || typeof entry !== "object") return false

  // The canonical chronicle_entry.v0 shape marker alone is sufficient: in
  // this codebase a canonical entry can only be legitimately produced by
  // the admission gate, regardless of what source_system claims or omits.
  if (entry.schema === "chronicle_entry.v0") return true
  if (typeof entry.proof_object_ref === "string" && RECEIPTOS_PROOF_REF_PATTERN.test(entry.proof_object_ref)) return true

  if (Array.isArray(entry.proof_object_refs) && entry.proof_object_refs.some(looksReceiptOSBackedRef)) return true

  return false
}

function isValidReceiptProofObject(proof) {
  return (
    proof &&
    typeof proof === "object" &&
    typeof proof.proof_object_id === "string" &&
    typeof proof.proof_system === "string" &&
    proof.proof_system === "ReceiptOS"
  )
}

function isValidReceiptTimelineCapsule(capsule) {
  return (
    capsule &&
    typeof capsule === "object" &&
    isValidReceiptProofObject(capsule.proof_object_ref) &&
    Array.isArray(capsule.events) &&
    capsule.events.every((event) =>
      event &&
      typeof event === "object" &&
      typeof event.event_id === "string" &&
      typeof event.label === "string" &&
      typeof event.created_at === "string" &&
      typeof event.relation_type === "string",
    )
  )
}

function compareEntries(a, b) {
  const aTs = a.created_at ?? ""
  const bTs = b.created_at ?? ""
  if (aTs !== bTs) return aTs.localeCompare(bTs)

  const aPos = a.chronology_position ?? ""
  const bPos = b.chronology_position ?? ""
  if (aPos !== bPos) return String(aPos).localeCompare(String(bPos))

  return a.entry_id.localeCompare(b.entry_id)
}

function deriveChronicleEdges(entries) {
  const ordered = [...entries].sort(compareEntries)
  const edges = []

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const current = ordered[index]

    edges.push({
      edge_id: `edge-${previous.entry_id}-to-${current.entry_id}`,
      from_entry_id: previous.entry_id,
      to_entry_id: current.entry_id,
      relation_type: current.relation_type ?? "continuation_of",
      created_at: current.created_at,
      metadata: {
        derived_by: "chronicle-local-node",
        derived: true,
      },
    })
  }

  return edges
}

function getProjectRefs(entries = entryStore) {
  return [...new Set(entries.flatMap((entry) => Array.isArray(entry.project_refs) ? entry.project_refs : []))].sort((a, b) => a.localeCompare(b))
}

function getReleaseId(entry) {
  return typeof entry?.metadata?.release === "string" && entry.metadata.release.trim()
    ? entry.metadata.release
    : "unreleased"
}

function getProfileId(entry) {
  return typeof entry?.metadata?.profile_id === "string" && entry.metadata.profile_id.trim()
    ? entry.metadata.profile_id
    : "unprofiled"
}

function getPositionId(entry) {
  if (typeof entry?.metadata?.position_id === "string" && entry.metadata.position_id.trim()) {
    return entry.metadata.position_id
  }

  if (Array.isArray(entry?.project_refs) && typeof entry.project_refs[0] === "string" && entry.project_refs[0].trim()) {
    return entry.project_refs[0]
  }

  return "unpositioned"
}

function getReleaseIds(entries = entryStore) {
  return [...new Set(entries.map((entry) => getReleaseId(entry)))].sort((a, b) => a.localeCompare(b))
}

function getProfileIds(entries = entryStore) {
  return [...new Set(entries.map((entry) => getProfileId(entry)))].sort((a, b) => a.localeCompare(b))
}

function getPositionIds(entries = entryStore) {
  return [...new Set(entries.map((entry) => getPositionId(entry)))].sort((a, b) => a.localeCompare(b))
}

function getCollectionIds(entries = entryStore) {
  return [...new Set(entries.flatMap((entry) => Array.isArray(entry.project_refs) ? entry.project_refs : []))].sort((a, b) => a.localeCompare(b))
}

function getPortfolioIds(entries = entryStore) {
  return [...new Set(entries.map((entry) => getPositionId(entry)))].sort((a, b) => a.localeCompare(b))
}

function getReceiptId(entry) {
  const proofRef = Array.isArray(entry?.proof_object_refs) ? entry.proof_object_refs[0] : undefined
  return typeof proofRef?.proof_object_id === "string" && proofRef.proof_object_id.trim()
    ? proofRef.proof_object_id
    : "unknown-receipt"
}

function getReceiptIds(entries = entryStore) {
  return [...new Set(entries.map((entry) => getReceiptId(entry)))].sort((a, b) => a.localeCompare(b))
}

function getEntriesForProject(projectRef) {
  return entryStore.filter((entry) => Array.isArray(entry.project_refs) && entry.project_refs.includes(projectRef))
}

function getEntriesForRelease(releaseId) {
  return entryStore.filter((entry) => getReleaseId(entry) === releaseId)
}

function getEntriesForProfile(profileId) {
  return entryStore.filter((entry) => getProfileId(entry) === profileId)
}

function getEntriesForPosition(positionId) {
  return entryStore.filter((entry) => getPositionId(entry) === positionId)
}

function getEntriesForCollection(collectionId) {
  return entryStore.filter((entry) => Array.isArray(entry.project_refs) && entry.project_refs.includes(collectionId))
}

function getEntriesForPortfolio(portfolioId) {
  return entryStore.filter((entry) => getPositionId(entry) === portfolioId)
}

function getEntriesForReceipt(receiptId) {
  return entryStore.filter((entry) => getReceiptId(entry) === receiptId)
}

function buildTimeline(entries = entryStore, options = {}) {
  const edges = deriveChronicleEdges(entries)
  return createChronicleTimeline({
    entries,
    edges,
    timeline_id: options.timeline_id ?? "chronicle-local-node-timeline",
    title: options.title ?? "Chronicle Local Node Timeline",
  })
}

function createChronicleBundle(scope, entries) {
  return {
    bundle_type: "chronicle.bundle.v0",
    exported_at: new Date().toISOString(),
    scope,
    entry_count: entries.length,
    entries,
  }
}

function createReceiptView(receiptId, entries) {
  const receiptEntries = [...entries].sort(compareEntries)
  const proofRef = receiptEntries[0]?.proof_object_refs?.[0]
  const linkedPositions = [...new Set(receiptEntries.map((entry) => getPositionId(entry)))].sort((a, b) => a.localeCompare(b))
  const linkedEntries = receiptEntries.map((entry) => entry.entry_id)

  return {
    receipt_id: receiptId,
    receipt_root: proofRef?.receipt_root ?? null,
    receipt_type: typeof proofRef?.metadata?.kind === "string" ? proofRef.metadata.kind : "ReceiptOS Proof",
    receipt_timestamp: receiptEntries[0]?.created_at ?? null,
    proof_refs: receiptEntries.flatMap((entry) => Array.isArray(entry.proof_object_refs) ? entry.proof_object_refs : []).filter((ref, index, array) => array.findIndex((other) => other.proof_object_id === ref.proof_object_id) === index),
    linked_entries: linkedEntries,
    linked_positions: linkedPositions,
  }
}

function createPositionArtifactIdentityInput(positionId, entries) {
  const entryRefs = [...entries].sort(compareEntries).map((entry) => entry.entry_id)
  const receiptRefs = [...new Set(entries.map((entry) => getReceiptId(entry)).filter((value) => typeof value === "string" && value.trim()))].sort((a, b) => a.localeCompare(b))

  return {
    artifact_version: POSITION_ARTIFACT_VERSION_V0,
    artifact_scope: "position",
    position_id: positionId,
    entry_refs: entryRefs,
    receipt_refs: receiptRefs,
  }
}

function createPositionArtifact(positionId, entries) {
  const scorecard = createPositionSummary(entries)
  const lineage = createPositionLineage(positionId, entries)
  const snapshot = createPositionSnapshot(positionId, entries)
  const artifactIdentityInput = createPositionArtifactIdentityInput(positionId, entries)
  const receiptIds = artifactIdentityInput.receipt_refs
  const artifactRoot = computeArtifactRootV0(artifactIdentityInput)

  return {
    artifact_version: POSITION_ARTIFACT_VERSION_V0,
    artifact_root: artifactRoot,
    position_id: positionId,
    receipt_count: receiptIds.length,
    entry_count: scorecard.event_count,
    project_count: scorecard.project_count,
    release_count: scorecard.release_count,
    first_seen: scorecard.first_event_at,
    latest_seen: scorecard.latest_event_at,
    active_days: scorecard.active_days,
    lineage_summary: {
      source_projects: lineage.source_projects,
      source_releases: lineage.source_releases,
      source_profiles: lineage.source_profiles,
      source_bundles: lineage.source_bundles,
      source_entries: lineage.source_entries,
      first_provenance_point: lineage.first_provenance_point,
      latest_provenance_point: lineage.latest_provenance_point,
    },
    snapshot_link: `/position/${encodeURIComponent(positionId)}/snapshot`,
    receipt_links: receiptIds.map((receiptId) => ({
      receipt_id: receiptId,
      href: `/receipt/${encodeURIComponent(receiptId)}/view`,
    })),
    snapshot,
  }
}

function createPositionSummary(entries) {
  const proofObjectIds = new Set()
  const projectIds = new Set()
  const releaseIds = new Set()
  const profileIds = new Set()
  const dayIds = new Set()
  const timestamps = []

  for (const entry of entries) {
    for (const ref of Array.isArray(entry.proof_object_refs) ? entry.proof_object_refs : []) {
      if (typeof ref.proof_object_id === "string") proofObjectIds.add(ref.proof_object_id)
    }
    for (const projectRef of Array.isArray(entry.project_refs) ? entry.project_refs : []) {
      if (typeof projectRef === "string") projectIds.add(projectRef)
    }
    const releaseId = getReleaseId(entry)
    if (releaseId) releaseIds.add(releaseId)
    const profileId = getProfileId(entry)
    if (profileId) profileIds.add(profileId)
    if (typeof entry.created_at === "string") {
      timestamps.push(entry.created_at)
      dayIds.add(entry.created_at.slice(0, 10))
    }
  }

  timestamps.sort((a, b) => a.localeCompare(b))

  return {
    event_count: entries.length,
    proof_object_count: proofObjectIds.size,
    project_count: projectIds.size,
    release_count: releaseIds.size,
    profile_count: profileIds.size,
    first_event_at: timestamps[0] ?? null,
    latest_event_at: timestamps[timestamps.length - 1] ?? null,
    active_days: dayIds.size,
  }
}

function createPositionEvolution(entries) {
  const ordered = [...entries].sort(compareEntries)
  const proofObjectIds = new Set()
  const projectIds = new Set()
  const dayIds = new Set()
  const firstSeen = ordered[0]?.created_at ?? null
  const latestSeen = ordered[ordered.length - 1]?.created_at ?? null

  const points = ordered.map((entry, index) => {
    for (const ref of Array.isArray(entry.proof_object_refs) ? entry.proof_object_refs : []) {
      if (typeof ref.proof_object_id === "string") proofObjectIds.add(ref.proof_object_id)
    }
    for (const projectRef of Array.isArray(entry.project_refs) ? entry.project_refs : []) {
      if (typeof projectRef === "string") projectIds.add(projectRef)
    }
    if (typeof entry.created_at === "string") {
      dayIds.add(entry.created_at.slice(0, 10))
    }

    return {
      step: index + 1,
      entry_id: entry.entry_id,
      label: typeof entry.metadata?.label === "string" ? entry.metadata.label : entry.entry_id,
      created_at: entry.created_at,
      cumulative_event_growth: index + 1,
      cumulative_proof_growth: proofObjectIds.size,
      cumulative_project_growth: projectIds.size,
      first_seen: firstSeen,
      latest_seen: latestSeen,
      active_days: dayIds.size,
    }
  })

  return {
    point_count: points.length,
    first_seen: firstSeen,
    latest_seen: latestSeen,
    active_days: dayIds.size,
    points,
  }
}

function createCollectionIdentityInput(collectionId, artifactRefs) {
  return {
    collection_version: COLLECTION_VERSION_V0,
    collection_id: collectionId,
    artifact_refs: [...artifactRefs].sort((a, b) => a.localeCompare(b)),
  }
}

function createCollection(collectionId, entries) {
  const positionIds = getPositionIds(entries)
  const artifactRefs = positionIds.map((positionId) => `/position/${encodeURIComponent(positionId)}/artifact`).sort((a, b) => a.localeCompare(b))
  const identityInput = createCollectionIdentityInput(collectionId, artifactRefs)
  const collectionRoot = computeCollectionRootV0(identityInput)
  const timestamps = entries
    .map((entry) => entry.created_at)
    .filter((value) => typeof value === "string")
    .sort((a, b) => a.localeCompare(b))

  return {
    collection_id: collectionId,
    collection_version: COLLECTION_VERSION_V0,
    collection_root: collectionRoot,
    artifact_refs: identityInput.artifact_refs,
    artifact_count: identityInput.artifact_refs.length,
    first_seen: timestamps[0] ?? null,
    latest_seen: timestamps[timestamps.length - 1] ?? null,
  }
}

function createPortfolioIdentityInput(portfolioId, collectionRefs) {
  return {
    portfolio_version: PORTFOLIO_VERSION_V0,
    portfolio_id: portfolioId,
    collection_refs: [...collectionRefs].sort((a, b) => a.localeCompare(b)),
  }
}

function createPortfolio(portfolioId, entries) {
  const collectionIds = getCollectionIds(entries)
  const collectionRefs = collectionIds.map((collectionId) => `/collection/${encodeURIComponent(collectionId)}`).sort((a, b) => a.localeCompare(b))
  const identityInput = createPortfolioIdentityInput(portfolioId, collectionRefs)
  const portfolioRoot = computePortfolioRootV0(identityInput)
  const timestamps = entries
    .map((entry) => entry.created_at)
    .filter((value) => typeof value === "string")
    .sort((a, b) => a.localeCompare(b))
  const artifactCount = collectionIds.reduce((count, collectionId) => count + createCollection(collectionId, getEntriesForCollection(collectionId)).artifact_count, 0)

  return {
    portfolio_id: portfolioId,
    portfolio_version: PORTFOLIO_VERSION_V0,
    portfolio_root: portfolioRoot,
    collection_refs: identityInput.collection_refs,
    collection_count: identityInput.collection_refs.length,
    artifact_count: artifactCount,
    first_seen: timestamps[0] ?? null,
    latest_seen: timestamps[timestamps.length - 1] ?? null,
  }
}

function createPositionSnapshot(positionId, entries) {
  const summary = createPositionSummary(entries)
  const evolution = createPositionEvolution(entries)
  const artifactIdentityInput = createPositionArtifactIdentityInput(positionId, entries)
  const artifactRoot = computeArtifactRootV0(artifactIdentityInput)
  const entryRefs = artifactIdentityInput.entry_refs
  const projectRefs = [...new Set(entries.flatMap((entry) => Array.isArray(entry.project_refs) ? entry.project_refs : []))].sort((a, b) => a.localeCompare(b))
  const releaseRefs = [...new Set(entries.map((entry) => getReleaseId(entry)))].sort((a, b) => a.localeCompare(b))
  const proofRefs = []
  const proofObjectIds = new Set()

  for (const entry of entries) {
    for (const ref of Array.isArray(entry.proof_object_refs) ? entry.proof_object_refs : []) {
      if (typeof ref.proof_object_id === "string" && !proofObjectIds.has(ref.proof_object_id)) {
        proofObjectIds.add(ref.proof_object_id)
        proofRefs.push(ref)
      }
    }
  }

  return {
    artifact_version: POSITION_ARTIFACT_VERSION_V0,
    artifact_root: artifactRoot,
    position_id: positionId,
    generated_at: new Date().toISOString(),
    scorecard: summary,
    evolution: {
      point_count: evolution.point_count,
      first_seen: evolution.first_seen,
      latest_seen: evolution.latest_seen,
      active_days: evolution.active_days,
    },
    entry_refs: entryRefs,
    project_refs: projectRefs,
    release_refs: releaseRefs,
    proof_refs: proofRefs,
  }
}

function createPositionLineage(positionId, entries) {
  const ordered = [...entries].sort(compareEntries)
  const sourceProjects = [...new Set(ordered.flatMap((entry) => Array.isArray(entry.project_refs) ? entry.project_refs : []))].sort((a, b) => a.localeCompare(b))
  const sourceReleases = [...new Set(ordered.map((entry) => getReleaseId(entry)))].sort((a, b) => a.localeCompare(b))
  const sourceProfiles = [...new Set(ordered.map((entry) => getProfileId(entry)))].sort((a, b) => a.localeCompare(b))
  const sourceBundles = [...new Set(ordered.map((entry) => entry?.metadata?.source_bundle_scope).filter((value) => typeof value === "string" && value.trim()))].sort((a, b) => a.localeCompare(b))
  const sourceEntries = ordered.map((entry) => entry.entry_id)
  const provenancePoints = ordered.map((entry) => entry.created_at).filter((value) => typeof value === "string").sort((a, b) => a.localeCompare(b))

  return {
    position_id: positionId,
    source_projects: sourceProjects,
    source_releases: sourceReleases,
    source_profiles: sourceProfiles,
    source_bundles: sourceBundles,
    source_entries: sourceEntries,
    first_provenance_point: provenancePoints[0] ?? null,
    latest_provenance_point: provenancePoints[provenancePoints.length - 1] ?? null,
  }
}

function isValidChronicleBundle(bundle) {
  return (
    bundle &&
    typeof bundle === "object" &&
    bundle.bundle_type === "chronicle.bundle.v0" &&
    Array.isArray(bundle.entries) &&
    bundle.entries.every(isValidChronicleEntry)
  )
}

function renderMarkdownTimeline(timeline) {
  const lines = ["# Chronicle Local Node History", ""]

  if (timeline.events.length === 0) {
    lines.push("No Chronicle entries stored yet.")
    return lines.join("\n")
  }

  for (const event of timeline.events) {
    lines.push(`- **${event.timestamp ?? "unknown time"}** — ${event.display_label}`)
    lines.push(`  - relation: \`${event.relation_type}\``)
    lines.push(`  - entry: \`${event.entry_id}\``)
    if (event.edge_id) lines.push(`  - edge: \`${event.edge_id}\``)
    lines.push(`  - proof refs: ${event.proof_object_refs.map((ref) => `\`${ref.proof_object_id}\``).join(", ")}`)
  }

  return lines.join("\n")
}

function renderProjectLinks(projectRefs) {
  if (projectRefs.length === 0) return "<p class=\"empty\">No project refs found yet.</p>"

  return `
    <div class="projects">
      <strong>Projects</strong>
      <ul>
        ${projectRefs.map((projectRef) => `<li><a href="/project/${encodeURIComponent(projectRef)}/view">${escapeHtml(projectRef)}</a> — <a href="/project/${encodeURIComponent(projectRef)}/export">export bundle</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderReleaseLinks(releaseIds) {
  if (releaseIds.length === 0) return "<p class=\"empty\">No release ids found yet.</p>"

  return `
    <div class="projects">
      <strong>Releases</strong>
      <ul>
        ${releaseIds.map((releaseId) => `<li><a href="/release/${encodeURIComponent(releaseId)}/view">${escapeHtml(releaseId)}</a> — <a href="/release/${encodeURIComponent(releaseId)}/export">export bundle</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderProfileLinks(profileIds) {
  if (profileIds.length === 0) return "<p class=\"empty\">No profile ids found yet.</p>"

  return `
    <div class="projects">
      <strong>Profiles</strong>
      <ul>
        ${profileIds.map((profileId) => `<li><a href="/profile/${encodeURIComponent(profileId)}/view">${escapeHtml(profileId)}</a> — <a href="/profile/${encodeURIComponent(profileId)}/export">export bundle</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderPositionLinks(positionIds) {
  if (positionIds.length === 0) return "<p class=\"empty\">No position ids found yet.</p>"

  return `
    <div class="projects">
      <strong>Positions</strong>
      <ul>
        ${positionIds.map((positionId) => `<li><a href="/position/${encodeURIComponent(positionId)}/view">${escapeHtml(positionId)}</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderArtifactLinks(positionIds) {
  if (positionIds.length === 0) return "<p class=\"empty\">No artifacts found yet.</p>"

  return `
    <div class="projects">
      <strong>Artifacts</strong>
      <ul>
        ${positionIds.map((positionId) => `<li><a href="/position/${encodeURIComponent(positionId)}/artifact">${escapeHtml(positionId)}</a> — <a href="/position/${encodeURIComponent(positionId)}/artifact/view">view artifact</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderReceiptLinks(receiptIds) {
  if (receiptIds.length === 0) return "<p class=\"empty\">No receipts found yet.</p>"

  return `
    <div class="projects">
      <strong>Receipts</strong>
      <ul>
        ${receiptIds.map((receiptId) => `<li><a href="/receipt/${encodeURIComponent(receiptId)}/view">${escapeHtml(receiptId)}</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderCollectionLinks(collectionIds) {
  if (collectionIds.length === 0) return "<p class=\"empty\">No collections found yet.</p>"

  return `
    <div class="projects">
      <strong>Collections</strong>
      <ul>
        ${collectionIds.map((collectionId) => `<li><a href="/collection/${encodeURIComponent(collectionId)}/view">${escapeHtml(collectionId)}</a> — <a href="/collection/${encodeURIComponent(collectionId)}/export">export collection</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderPortfolioLinks(portfolioIds) {
  if (portfolioIds.length === 0) return "<p class=\"empty\">No portfolios found yet.</p>"

  return `
    <div class="projects">
      <strong>Portfolios</strong>
      <ul>
        ${portfolioIds.map((portfolioId) => `<li><a href="/portfolio/${encodeURIComponent(portfolioId)}/view">${escapeHtml(portfolioId)}</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

function renderBundleExportLinks(options = {}) {
  const positionId = options.positionId
  const items = [
    { label: "all-history-bundle", href: "/export" },
    { label: "stored-entries-json", href: "/entries" },
    { label: "timeline-json", href: "/timeline" },
    { label: "history-markdown", href: "/chronicle.md" },
  ]

  if (positionId) {
    items.push(
      { label: `${positionId} bundle`, href: `/position/${encodeURIComponent(positionId)}/export` },
      { label: `${positionId} snapshot`, href: `/position/${encodeURIComponent(positionId)}/snapshot` },
    )
  }

  return `
    <div class="projects">
      <strong>Bundles / Exports</strong>
      <ul>
        ${items.map((item) => `<li><a href="${item.href}">${escapeHtml(item.label)}</a></li>`).join("\n")}
      </ul>
    </div>
  `
}

export function renderCollectionHtml(collectionId, collection) {
  const artifactRefs = collection.artifact_refs.length === 0
    ? "<em>none</em>"
    : collection.artifact_refs.map((artifactRef) => `<div><code>${escapeHtml(artifactRef)}</code></div>`).join("")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chronicle Artifact Collection: ${escapeHtml(collectionId)}</title>
    <style>
      body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f7f7f9; color: #1f2937; }
      main { max-width: 1000px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 2rem; }
      p { color: #6b7280; }
      .links a { color: #111827; text-decoration: none; margin-right: 16px; }
      .card, table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; margin-top: 20px; }
      .card { padding: 16px 18px; box-sizing: border-box; }
      th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
      th { width: 240px; background: #f9fafb; }
      tr:last-child th, tr:last-child td { border-bottom: none; }
      code { background: #eef2f7; padding: 1px 5px; border-radius: 6px; }
      .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
      .metric { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .metric strong { display: block; font-size: 0.9rem; color: #6b7280; margin-bottom: 4px; }
      .metric span { font-size: 1.1rem; font-weight: 700; }
      .root-block { margin-top: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .root-block strong { display: block; font-size: 0.9rem; color: #6b7280; margin-bottom: 8px; }
      .root-block code { display: block; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font-size: 0.95rem; line-height: 1.5; padding: 10px 12px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Chronicle Artifact Collection: ${escapeHtml(collectionId)}</h1>
      <p>Receipt → receipt_root. Artifact → artifact_root. Collection → collection_root. Collection recomputes history. It does not score, certify, verify, or sign artifacts.</p>
      <div class="links">
        <a href="/collections">View collections</a>
        <a href="/collection/${encodeURIComponent(collectionId)}">View collection JSON</a>
        <a href="/collection/${encodeURIComponent(collectionId)}/export">Export collection</a>
        <a href="/view">Back to all history</a>
      </div>
      <div class="card">
        <div class="metric-grid">
          <div class="metric"><strong>collection_id</strong><span>${escapeHtml(collection.collection_id)}</span></div>
          <div class="metric"><strong>collection_version</strong><span>${escapeHtml(collection.collection_version)}</span></div>
          <div class="metric"><strong>artifact_count</strong><span>${escapeHtml(collection.artifact_count)}</span></div>
          <div class="metric"><strong>first_seen</strong><span>${escapeHtml(collection.first_seen ?? "n/a")}</span></div>
          <div class="metric"><strong>latest_seen</strong><span>${escapeHtml(collection.latest_seen ?? "n/a")}</span></div>
        </div>
        <div class="root-block">
          <strong>collection_root</strong>
          <code>${escapeHtml(collection.collection_root)}</code>
        </div>
      </div>
      <table>
        <tbody>
          <tr><th><code>artifact_refs</code></th><td>${artifactRefs}</td></tr>
        </tbody>
      </table>
    </main>
  </body>
</html>`
}

export function renderPortfolioHtml(portfolioId, portfolio) {
  const collectionRefs = portfolio.collection_refs.length === 0
    ? "<em>none</em>"
    : portfolio.collection_refs.map((collectionRef) => `<div><code>${escapeHtml(collectionRef)}</code></div>`).join("")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chronicle Portfolio: ${escapeHtml(portfolioId)}</title>
    <style>
      body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f7f7f9; color: #1f2937; }
      main { max-width: 1000px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 2rem; }
      p { color: #6b7280; }
      .links a { color: #111827; text-decoration: none; margin-right: 16px; }
      .card, table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; margin-top: 20px; }
      .card { padding: 16px 18px; box-sizing: border-box; }
      th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
      th { width: 240px; background: #f9fafb; }
      tr:last-child th, tr:last-child td { border-bottom: none; }
      code { background: #eef2f7; padding: 1px 5px; border-radius: 6px; }
      .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
      .metric { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .metric strong { display: block; font-size: 0.9rem; color: #6b7280; margin-bottom: 4px; }
      .metric span { font-size: 1.1rem; font-weight: 700; }
      .root-block { margin-top: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .root-block strong { display: block; font-size: 0.9rem; color: #6b7280; margin-bottom: 8px; }
      .root-block code { display: block; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font-size: 0.95rem; line-height: 1.5; padding: 10px 12px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Chronicle Portfolio: ${escapeHtml(portfolioId)}</h1>
      <p>Receipt → receipt_root. Artifact → artifact_root. Collection → collection_root. Portfolio → portfolio_root. A Portfolio recomputes a portable body of Chronicle history. It does not score, certify, verify, sign, or create ownership.</p>
      <div class="links">
        <a href="/portfolios">View portfolios</a>
        <a href="/portfolio/${encodeURIComponent(portfolioId)}">View portfolio JSON</a>
        <a href="/portfolio/${encodeURIComponent(portfolioId)}/export">Export portfolio</a>
        <a href="/view">Back to all history</a>
      </div>
      <div class="card">
        <div class="metric-grid">
          <div class="metric"><strong>portfolio_id</strong><span>${escapeHtml(portfolio.portfolio_id)}</span></div>
          <div class="metric"><strong>portfolio_version</strong><span>${escapeHtml(portfolio.portfolio_version)}</span></div>
          <div class="metric"><strong>collection_count</strong><span>${escapeHtml(portfolio.collection_count)}</span></div>
          <div class="metric"><strong>artifact_count</strong><span>${escapeHtml(portfolio.artifact_count)}</span></div>
          <div class="metric"><strong>first_seen</strong><span>${escapeHtml(portfolio.first_seen ?? "n/a")}</span></div>
          <div class="metric"><strong>latest_seen</strong><span>${escapeHtml(portfolio.latest_seen ?? "n/a")}</span></div>
        </div>
        <div class="root-block">
          <strong>portfolio_root</strong>
          <code>${escapeHtml(portfolio.portfolio_root)}</code>
        </div>
      </div>
      <table>
        <tbody>
          <tr><th><code>collection_refs</code></th><td>${collectionRefs}</td></tr>
        </tbody>
      </table>
    </main>
  </body>
</html>`
}

export function renderArtifactHtml(positionId, artifact) {
  const lineageList = (items) => items.length === 0 ? "<em>none</em>" : items.map((item) => `<code>${escapeHtml(item)}</code>`).join(", ")
  const receiptLinks = artifact.receipt_links.length === 0
    ? "<em>none</em>"
    : artifact.receipt_links.map((item) => `<li><a href="${item.href}">${escapeHtml(item.receipt_id)}</a></li>`).join("\n")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chronicle Position Artifact: ${escapeHtml(positionId)}</title>
    <style>
      body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f7f7f9; color: #1f2937; }
      main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 2rem; }
      p { color: #6b7280; }
      .links a { color: #111827; text-decoration: none; margin-right: 16px; }
      .card, table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; margin-top: 20px; }
      .card { padding: 16px 18px; box-sizing: border-box; }
      th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
      th { width: 240px; background: #f9fafb; }
      tr:last-child th, tr:last-child td { border-bottom: none; }
      code { background: #eef2f7; padding: 1px 5px; border-radius: 6px; }
      ul { margin: 8px 0 0; }
      .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
      .metric { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .metric strong { display: block; font-size: 0.9rem; color: #6b7280; margin-bottom: 4px; }
      .metric span { font-size: 1.1rem; font-weight: 700; }
      .artifact-root-block { margin-top: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .artifact-root-block strong { display: block; font-size: 0.9rem; color: #6b7280; margin-bottom: 8px; }
      .artifact-root-block code { display: block; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font-size: 0.95rem; line-height: 1.5; padding: 10px 12px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Chronicle Position Artifact: ${escapeHtml(positionId)}</h1>
      <p>ReceiptOS proves what happened. Chronicle turns proven events into portable history. This artifact is a local visible form of accumulated verified history.</p>
      <div class="links">
        <a href="/position/${encodeURIComponent(positionId)}/view">View Position history</a>
        <a href="/position/${encodeURIComponent(positionId)}/scorecard/view">View Position scorecard</a>
        <a href="/position/${encodeURIComponent(positionId)}/evolution/view">View Position evolution</a>
        <a href="/position/${encodeURIComponent(positionId)}/lineage/view">View Position lineage</a>
        <a href="${artifact.snapshot_link}">Export Position snapshot</a>
        <a href="/view">Back to all history</a>
      </div>
      <div class="card">
        <div class="metric-grid">
          <div class="metric"><strong>position_id</strong><span>${escapeHtml(artifact.position_id)}</span></div>
          <div class="metric"><strong>artifact_version</strong><span>${escapeHtml(artifact.artifact_version)}</span></div>
          <div class="metric"><strong>receipt_count</strong><span>${escapeHtml(artifact.receipt_count)}</span></div>
          <div class="metric"><strong>entry_count</strong><span>${escapeHtml(artifact.entry_count)}</span></div>
          <div class="metric"><strong>project_count</strong><span>${escapeHtml(artifact.project_count)}</span></div>
          <div class="metric"><strong>release_count</strong><span>${escapeHtml(artifact.release_count)}</span></div>
          <div class="metric"><strong>first_seen</strong><span>${escapeHtml(artifact.first_seen ?? "n/a")}</span></div>
          <div class="metric"><strong>latest_seen</strong><span>${escapeHtml(artifact.latest_seen ?? "n/a")}</span></div>
          <div class="metric"><strong>active_days</strong><span>${escapeHtml(artifact.active_days)}</span></div>
        </div>
        <div class="artifact-root-block">
          <strong>artifact_root</strong>
          <code>${escapeHtml(artifact.artifact_root)}</code>
        </div>
      </div>
      <table>
        <tbody>
          <tr><th><code>source_projects</code></th><td>${lineageList(artifact.lineage_summary.source_projects)}</td></tr>
          <tr><th><code>source_releases</code></th><td>${lineageList(artifact.lineage_summary.source_releases)}</td></tr>
          <tr><th><code>source_profiles</code></th><td>${lineageList(artifact.lineage_summary.source_profiles)}</td></tr>
          <tr><th><code>source_bundles</code></th><td>${lineageList(artifact.lineage_summary.source_bundles)}</td></tr>
          <tr><th><code>first_provenance_point</code></th><td>${escapeHtml(artifact.lineage_summary.first_provenance_point ?? "n/a")}</td></tr>
          <tr><th><code>latest_provenance_point</code></th><td>${escapeHtml(artifact.lineage_summary.latest_provenance_point ?? "n/a")}</td></tr>
          <tr><th><code>snapshot_link</code></th><td><a href="${artifact.snapshot_link}">${artifact.snapshot_link}</a></td></tr>
          <tr><th><code>receipt_links</code></th><td><ul>${receiptLinks}</ul></td></tr>
        </tbody>
      </table>
    </main>
  </body>
</html>`
}

function renderReceiptHtml(receipt) {
  const renderList = (items) => items.length === 0 ? "<em>none</em>" : items.map((item) => `<code>${escapeHtml(item)}</code>`).join(", ")
  const renderPositionList = (items) => items.length === 0 ? "<em>none</em>" : items.map((item) => `<a href="/position/${encodeURIComponent(item)}/view"><code>${escapeHtml(item)}</code></a>`).join(", ")
  const proofRefs = receipt.proof_refs.length === 0
    ? "<em>none</em>"
    : receipt.proof_refs.map((ref) => `<div><code>${escapeHtml(ref.proof_object_id)}</code> — ${escapeHtml(ref.proof_ref ?? "no-proof-ref")}</div>`).join("")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ReceiptOS Receipt View: ${escapeHtml(receipt.receipt_id)}</title>
    <style>
      body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f7f7f9; color: #1f2937; }
      main { max-width: 1000px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 2rem; }
      p { color: #6b7280; }
      .links a { color: #111827; text-decoration: none; margin-right: 16px; }
      table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; margin-top: 20px; }
      th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
      th { width: 260px; background: #f9fafb; }
      tr:last-child th, tr:last-child td { border-bottom: none; }
      code { background: #eef2f7; padding: 1px 5px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>ReceiptOS Receipt View: ${escapeHtml(receipt.receipt_id)}</h1>
      <p>ReceiptOS proves what happened. Chronicle explains how this proven event became linked history.</p>
      <div class="links">
        <a href="/entries">View stored entries</a>
        <a href="/positions">View positions</a>
        <a href="/view">Back to all history</a>
      </div>
      <table>
        <tbody>
          <tr><th><code>receipt_id</code></th><td>${escapeHtml(receipt.receipt_id)}</td></tr>
          <tr><th><code>receipt_root</code></th><td>${escapeHtml(receipt.receipt_root ?? "n/a")}</td></tr>
          <tr><th><code>receipt_type</code></th><td>${escapeHtml(receipt.receipt_type ?? "n/a")}</td></tr>
          <tr><th><code>receipt_timestamp</code></th><td>${escapeHtml(receipt.receipt_timestamp ?? "n/a")}</td></tr>
          <tr><th><code>proof_refs</code></th><td>${proofRefs}</td></tr>
          <tr><th><code>linked_entries</code></th><td>${renderList(receipt.linked_entries)}</td></tr>
          <tr><th><code>linked_positions</code></th><td>${renderPositionList(receipt.linked_positions)}</td></tr>
        </tbody>
      </table>
    </main>
  </body>
</html>`
}

function renderLineageHtml(positionId, lineage) {
  const renderList = (items) => items.length === 0 ? "<em>none</em>" : items.map((item) => `<code>${escapeHtml(item)}</code>`).join(", ")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chronicle Position Lineage: ${escapeHtml(positionId)}</title>
    <style>
      body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f7f7f9; color: #1f2937; }
      main { max-width: 1000px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 2rem; }
      p { color: #6b7280; }
      .links a { color: #111827; text-decoration: none; margin-right: 16px; }
      table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; margin-top: 20px; }
      th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
      th { width: 260px; background: #f9fafb; }
      tr:last-child th, tr:last-child td { border-bottom: none; }
      code { background: #eef2f7; padding: 1px 5px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Chronicle Position Lineage: ${escapeHtml(positionId)}</h1>
      <p>Derived provenance summary for where this accumulated verified history came from.</p>
      <div class="links">
        <a href="/position/${encodeURIComponent(positionId)}/view">View Position history</a>
        <a href="/position/${encodeURIComponent(positionId)}/scorecard/view">View Position scorecard</a>
        <a href="/position/${encodeURIComponent(positionId)}/evolution/view">View Position evolution</a>
        <a href="/position/${encodeURIComponent(positionId)}/snapshot">Export Position snapshot</a>
        <a href="/position/${encodeURIComponent(positionId)}/export">Export Position bundle</a>
        <a href="/view">Back to all history</a>
      </div>
      <table>
        <tbody>
          <tr><th><code>source_projects</code></th><td>${renderList(lineage.source_projects)}</td></tr>
          <tr><th><code>source_releases</code></th><td>${renderList(lineage.source_releases)}</td></tr>
          <tr><th><code>source_profiles</code></th><td>${renderList(lineage.source_profiles)}</td></tr>
          <tr><th><code>source_bundles</code></th><td>${renderList(lineage.source_bundles)}</td></tr>
          <tr><th><code>source_entries</code></th><td>${renderList(lineage.source_entries)}</td></tr>
          <tr><th><code>first_provenance_point</code></th><td>${escapeHtml(lineage.first_provenance_point ?? "n/a")}</td></tr>
          <tr><th><code>latest_provenance_point</code></th><td>${escapeHtml(lineage.latest_provenance_point ?? "n/a")}</td></tr>
        </tbody>
      </table>
    </main>
  </body>
</html>`
}

function renderEvolutionHtml(positionId, evolution) {
  const rows = evolution.points.length === 0
    ? `<tr><td colspan="7">No evolution points available yet.</td></tr>`
    : evolution.points.map((point) => `
      <tr>
        <td>${escapeHtml(point.step)}</td>
        <td><code>${escapeHtml(point.entry_id)}</code></td>
        <td>${escapeHtml(point.label)}</td>
        <td>${escapeHtml(point.created_at ?? "n/a")}</td>
        <td>${escapeHtml(point.cumulative_event_growth)}</td>
        <td>${escapeHtml(point.cumulative_proof_growth)}</td>
        <td>${escapeHtml(point.cumulative_project_growth)}</td>
      </tr>
    `).join("\n")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chronicle Position Evolution: ${escapeHtml(positionId)}</title>
    <style>
      body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f7f7f9; color: #1f2937; }
      main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 2rem; }
      p { color: #6b7280; }
      .links a { color: #111827; text-decoration: none; margin-right: 16px; }
      .meta { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; margin-top: 20px; }
      .meta th, .meta td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; }
      .meta th { width: 220px; background: #f9fafb; }
      .meta tr:last-child th, .meta tr:last-child td { border-bottom: none; }
      table.grid { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; margin-top: 20px; }
      table.grid th, table.grid td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
      table.grid th { background: #f9fafb; }
      table.grid tr:last-child td { border-bottom: none; }
      code { background: #eef2f7; padding: 1px 5px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Chronicle Position Evolution: ${escapeHtml(positionId)}</h1>
      <p>Derived local evolution history for how this Chronicle Position accumulates verified work over time.</p>
      <div class="links">
        <a href="/position/${encodeURIComponent(positionId)}/view">View Position history</a>
        <a href="/position/${encodeURIComponent(positionId)}/scorecard/view">View Position scorecard</a>
        <a href="/position/${encodeURIComponent(positionId)}/snapshot">Export Position snapshot</a>
        <a href="/position/${encodeURIComponent(positionId)}/lineage/view">View Position lineage</a>
        <a href="/position/${encodeURIComponent(positionId)}/artifact/view">View Position artifact</a>
        <a href="/position/${encodeURIComponent(positionId)}/export">Export Position bundle</a>
        <a href="/view">Back to all history</a>
      </div>
      <table class="meta">
        <tbody>
          <tr><th><code>point_count</code></th><td>${escapeHtml(evolution.point_count)}</td></tr>
          <tr><th><code>first_seen</code></th><td>${escapeHtml(evolution.first_seen ?? "n/a")}</td></tr>
          <tr><th><code>latest_seen</code></th><td>${escapeHtml(evolution.latest_seen ?? "n/a")}</td></tr>
          <tr><th><code>active_days</code></th><td>${escapeHtml(evolution.active_days)}</td></tr>
        </tbody>
      </table>
      <table class="grid">
        <thead>
          <tr>
            <th>Step</th>
            <th>Entry</th>
            <th>Label</th>
            <th>Created At</th>
            <th>Cumulative Events</th>
            <th>Cumulative Proofs</th>
            <th>Cumulative Projects</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </main>
  </body>
</html>`
}

function renderScorecardHtml(positionId, summary) {
  const rows = [
    ["event_count", summary.event_count],
    ["proof_object_count", summary.proof_object_count],
    ["project_count", summary.project_count],
    ["release_count", summary.release_count],
    ["profile_count", summary.profile_count],
    ["first_event_at", summary.first_event_at ?? "n/a"],
    ["latest_event_at", summary.latest_event_at ?? "n/a"],
    ["active_days", summary.active_days],
  ]

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chronicle Position Scorecard: ${escapeHtml(positionId)}</title>
    <style>
      body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f7f7f9; color: #1f2937; }
      main { max-width: 900px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 2rem; }
      p { color: #6b7280; }
      .links a { color: #111827; text-decoration: none; margin-right: 16px; }
      table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; margin-top: 20px; }
      th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; }
      th { width: 240px; background: #f9fafb; }
      tr:last-child th, tr:last-child td { border-bottom: none; }
      code { background: #eef2f7; padding: 1px 5px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Chronicle Position Scorecard: ${escapeHtml(positionId)}</h1>
      <p>Derived local metrics for the accumulated verified history inside this Chronicle Position.</p>
      <div class="links">
        <a href="/position/${encodeURIComponent(positionId)}/view">View Position history</a>
        <a href="/position/${encodeURIComponent(positionId)}/evolution/view">View Position evolution</a>
        <a href="/position/${encodeURIComponent(positionId)}/snapshot">Export Position snapshot</a>
        <a href="/position/${encodeURIComponent(positionId)}/export">Export Position bundle</a>
        <a href="/view">Back to all history</a>
      </div>
      <table>
        <tbody>
          ${rows.map(([label, value]) => `<tr><th><code>${escapeHtml(label)}</code></th><td>${escapeHtml(value)}</td></tr>`).join("\n")}
        </tbody>
      </table>
    </main>
  </body>
</html>`
}

export function renderHtmlView(timeline, options = {}) {
  const heading = options.heading ?? "Chronicle Local Node History"
  const lead = options.lead ?? "A simple local browser view over persisted Chronicle timeline events."
  const backLink = options.backLink ? `<a href="${options.backLink}">Back to all history</a>` : ""
  const eventItems = timeline.events.length === 0
    ? `<p class="empty">No Chronicle entries stored yet.</p>`
    : timeline.events.map((event) => `
      <article class="event">
        <div class="event-header">
          <div class="timestamp">${escapeHtml(event.timestamp ?? "unknown time")}</div>
          <div class="label">${escapeHtml(event.display_label)}</div>
        </div>
        <ul>
          <li><strong>relation_type:</strong> <code>${escapeHtml(event.relation_type)}</code></li>
          <li><strong>entry_id:</strong> <code>${escapeHtml(event.entry_id)}</code></li>
          <li><strong>proof refs:</strong> ${event.proof_object_refs.map((ref) => `<code>${escapeHtml(ref.proof_object_id)}</code>`).join(", ")}</li>
        </ul>
      </article>
    `).join("\n")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f7f9;
        --card: #ffffff;
        --text: #1f2937;
        --muted: #6b7280;
        --border: #d1d5db;
        --accent: #111827;
      }
      body {
        margin: 0;
        font-family: Inter, Segoe UI, Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 2rem;
      }
      p.lead {
        margin: 0 0 20px;
        color: var(--muted);
      }
      .links {
        margin: 0 0 24px;
      }
      .links a {
        color: var(--accent);
        text-decoration: none;
        margin-right: 16px;
      }
      .meta, .projects {
        margin: 0 0 24px;
        padding: 12px 16px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 10px;
      }
      .projects ul {
        margin: 8px 0 0;
      }
      .projects a {
        color: var(--accent);
        text-decoration: none;
      }
      .event {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px 18px;
        margin-bottom: 14px;
      }
      .event-header {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        align-items: baseline;
        margin-bottom: 10px;
      }
      .timestamp {
        color: var(--muted);
        font-size: 0.95rem;
      }
      .label {
        font-weight: 700;
        font-size: 1.05rem;
      }
      ul {
        margin: 0;
        padding-left: 18px;
      }
      code {
        background: #eef2f7;
        padding: 1px 5px;
        border-radius: 6px;
      }
      .empty {
        background: var(--card);
        border: 1px dashed var(--border);
        border-radius: 12px;
        padding: 20px;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(heading)}</h1>
      <p class="lead">${escapeHtml(lead)}</p>
      <div class="links">
        ${options.positionId ? `<a href="/position/${encodeURIComponent(options.positionId)}/scorecard/view">View Position scorecard</a>` : ""}
        ${options.positionId ? `<a href="/position/${encodeURIComponent(options.positionId)}/evolution/view">View Position evolution</a>` : ""}
        ${options.positionId ? `<a href="/position/${encodeURIComponent(options.positionId)}/snapshot">Export Position snapshot</a>` : ""}
        ${options.positionId ? `<a href="/position/${encodeURIComponent(options.positionId)}/lineage/view">View Position lineage</a>` : ""}
        ${options.positionId ? `<a href="/position/${encodeURIComponent(options.positionId)}/artifact/view">View Position artifact</a>` : ""}
        ${backLink}
      </div>
      <div class="meta">
        <strong>Timeline:</strong> ${escapeHtml(timeline.title)}<br />
        <strong>Event count:</strong> ${escapeHtml(timeline.events.length)}
      </div>
      ${renderReceiptLinks(getReceiptIds())}
      ${renderPositionLinks(getPositionIds())}
      ${renderArtifactLinks(getPositionIds())}
      ${renderCollectionLinks(getCollectionIds())}
      ${renderPortfolioLinks(getPortfolioIds())}
      ${renderBundleExportLinks(options)}
      ${eventItems}
    </main>
  </body>
</html>`
}

loadStore()

export { createPositionArtifact, createPositionSnapshot, createCollection, createPortfolio }

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${PORT}`}`)

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, { ok: true })
    }

    if (request.method === "POST" && url.pathname === "/entries") {
      const entry = await readJsonBody(request)

      // A caller cannot manufacture a ReceiptOS-backed Entry (canonical or
      // legacy shape) by asserting the shape directly: admission for
      // ReceiptOS-backed history requires independent recomputation, which
      // only happens in-process via /import/receipt.
      if (isReceiptOSBackedEntrySubmission(entry)) {
        return json(response, 400, {
          ok: false,
          error: "ReceiptOS-backed Chronicle Entries cannot be submitted directly to /entries. Use POST /import/receipt with { evidence, proof_object } so admission can be independently verified.",
        })
      }

      if (!isValidChronicleEntry(entry)) {
        return json(response, 400, {
          ok: false,
          error: "Invalid Chronicle Entry payload",
          required: ["entry_id", "proof_object_refs[]", "created_at"],
        })
      }

      const admission = classifyEntryAdmission(entryStore, entry)

      if (admission.result === IDENTITY_RESULT.IDEMPOTENT) {
        return json(response, 200, {
          ok: true,
          stored: admission.existing.entry_id,
          existing: true,
          entry_count: entryStore.length,
          store_path: STORE_PATH,
        })
      }

      if (admission.result === IDENTITY_RESULT.CONFLICT) {
        return json(response, 409, {
          ok: false,
          error: "Conflicting Chronicle Entry: the same identity already exists with different canonical content.",
          existing_entry_id: admission.existing.entry_id,
          entry_count: entryStore.length,
        })
      }

      entryStore.push(structuredClone(entry))
      saveStore()
      return json(response, 201, {
        ok: true,
        stored: entry.entry_id,
        existing: false,
        entry_count: entryStore.length,
        store_path: STORE_PATH,
      })
    }

    if (request.method === "POST" && url.pathname === "/import/receipt") {
      const body = await readJsonBody(request)

      // The old proof-object-only body is rejected here on purpose: a proof
      // object alone carries no recomputation basis. Both the original
      // evidence and the proof object are required.
      if (!body || typeof body !== "object" || !body.evidence || !body.proof_object) {
        return json(response, 400, {
          ok: false,
          error: "Invalid ReceiptOS import payload: requires both `evidence` (the original HandoffEvidence) and `proof_object` (PortableProofObjectV0). A proof object alone cannot be independently recomputed and is rejected as unverifiable.",
          required: ["evidence", "proof_object"],
        })
      }

      const entryOptions = body.options && typeof body.options === "object"
        ? {
          entryId: typeof body.options.entryId === "string" ? body.options.entryId : undefined,
          labels: Array.isArray(body.options.labels) ? body.options.labels : undefined,
          notes: typeof body.options.notes === "string" ? body.options.notes : undefined,
          createdFrom: typeof body.options.createdFrom === "string" ? body.options.createdFrom : undefined,
        }
        : undefined

      let entry
      try {
        entry = admitReceiptOSChronicleEntryV0(body.evidence, body.proof_object, entryOptions)
      } catch (error) {
        if (error instanceof ReceiptOSAdmissionError) {
          return json(response, 422, {
            ok: false,
            error: error.message,
            code: error.code,
          })
        }
        throw error
      }

      const admission = classifyEntryAdmission(entryStore, entry)

      if (admission.result === IDENTITY_RESULT.IDEMPOTENT) {
        return json(response, 200, {
          ok: true,
          imported: false,
          existing: true,
          entry_id: admission.existing.entry_id,
          entry_count: entryStore.length,
          store_path: STORE_PATH,
        })
      }

      if (admission.result === IDENTITY_RESULT.CONFLICT) {
        return json(response, 409, {
          ok: false,
          error: "Conflicting Chronicle Entry: the same identity (entry_id or proof_object_ref) already exists with different canonical content.",
          existing_entry_id: admission.existing.entry_id,
          entry_count: entryStore.length,
        })
      }

      entryStore.push(structuredClone(entry))
      saveStore()

      return json(response, 201, {
        ok: true,
        imported: true,
        existing: false,
        created_entry_id: entry.entry_id,
        entry_count: entryStore.length,
        store_path: STORE_PATH,
      })
    }

    if (request.method === "POST" && url.pathname === "/import/receipt-timeline") {
      const capsule = await readJsonBody(request)

      if (!isValidReceiptTimelineCapsule(capsule)) {
        return json(response, 400, {
          ok: false,
          error: "Invalid ReceiptOS timeline capsule payload",
          required: ["proof_object_ref", "project_refs", "events[]"],
        })
      }

      // This route's own shape validator (isValidReceiptTimelineCapsule ->
      // isValidReceiptProofObject) already requires proof_system === "ReceiptOS"
      // literally, so every payload that reaches this point is ReceiptOS-backed
      // by construction. This route's payload shape carries no original
      // evidence, so no candidate here ever has a recomputation basis: fail
      // closed unconditionally rather than admit on shape validity alone.
      return json(response, 400, {
        ok: false,
        error: "ReceiptOS-backed timeline capsules cannot be admitted via /import/receipt-timeline: this payload carries no original evidence to independently recompute against. Import each event's underlying evidence through /import/receipt instead.",
      })
    }

    if (request.method === "POST" && url.pathname === "/import/bundle") {
      const bundle = await readJsonBody(request)

      if (!isValidChronicleBundle(bundle)) {
        return json(response, 400, {
          ok: false,
          error: "Invalid Chronicle bundle payload",
          required: ["bundle_type=chronicle.bundle.v0", "entries[]"],
        })
      }

      // A bundle carries no original evidence for any member entry. If any
      // entry claims a ReceiptOS-backed identity, the whole bundle is
      // rejected rather than silently admitting the unverifiable members.
      if (bundle.entries.some(isReceiptOSBackedEntrySubmission)) {
        return json(response, 400, {
          ok: false,
          error: "This bundle contains a ReceiptOS-backed Entry. Bundles carry no original evidence and cannot be independently recomputed; import ReceiptOS-backed entries individually through /import/receipt.",
        })
      }

      // Preflight every candidate against a working copy of the store before
      // mutating anything. If any candidate conflicts, the whole bundle is
      // rejected with no partial insert -- never a silent conflicting-content
      // discard, never a half-applied bundle.
      const workingSet = [...entryStore]
      const preflight = []

      for (const rawEntry of bundle.entries) {
        const candidate = structuredClone(rawEntry)
        candidate.metadata = {
          ...(candidate.metadata && typeof candidate.metadata === "object" ? candidate.metadata : {}),
          source_bundle_scope: bundle.scope,
        }

        const admission = classifyEntryAdmission(workingSet, candidate)
        preflight.push({ candidate, admission })

        if (admission.result === IDENTITY_RESULT.NEW) {
          workingSet.push(candidate)
        }
      }

      const conflicts = preflight.filter((entry) => entry.admission.result === IDENTITY_RESULT.CONFLICT)
      if (conflicts.length > 0) {
        return json(response, 409, {
          ok: false,
          error: "Conflicting Chronicle Entry in bundle: one or more entries share an identity with existing or other in-bundle content that differs canonically. No entry from this bundle was stored.",
          conflicting_entry_ids: conflicts.map((entry) => entry.candidate.entry_id),
          entry_count: entryStore.length,
        })
      }

      let importedCount = 0
      let existingCount = 0
      const importedEntryIds = []
      const existingEntryIds = []

      for (const { candidate, admission } of preflight) {
        if (admission.result === IDENTITY_RESULT.IDEMPOTENT) {
          existingCount += 1
          existingEntryIds.push(admission.existing.entry_id)
          continue
        }

        entryStore.push(candidate)
        importedCount += 1
        importedEntryIds.push(candidate.entry_id)
      }

      if (importedCount > 0) saveStore()

      return json(response, importedCount > 0 ? 201 : 200, {
        ok: true,
        imported: importedCount > 0,
        imported_count: importedCount,
        existing_count: existingCount,
        imported_entry_ids: importedEntryIds,
        existing_entry_ids: existingEntryIds,
        entry_count: entryStore.length,
        scope: bundle.scope,
        store_path: STORE_PATH,
      })
    }

    if (request.method === "GET" && url.pathname === "/entries") {
      return json(response, 200, {
        ok: true,
        count: entryStore.length,
        entries: entryStore,
        store_path: STORE_PATH,
      })
    }

    if (request.method === "GET" && url.pathname === "/projects") {
      const projects = getProjectRefs()
      return json(response, 200, {
        ok: true,
        count: projects.length,
        projects,
      })
    }

    if (request.method === "GET" && url.pathname === "/releases") {
      const releases = getReleaseIds()
      return json(response, 200, {
        ok: true,
        count: releases.length,
        releases,
      })
    }

    if (request.method === "GET" && url.pathname === "/profiles") {
      const profiles = getProfileIds()
      return json(response, 200, {
        ok: true,
        count: profiles.length,
        profiles,
      })
    }

    if (request.method === "GET" && url.pathname === "/positions") {
      const positions = getPositionIds()
      return json(response, 200, {
        ok: true,
        count: positions.length,
        positions,
      })
    }

    if (request.method === "GET" && url.pathname === "/collections") {
      const collections = getCollectionIds().map((collectionId) => createCollection(collectionId, getEntriesForCollection(collectionId)))
      return json(response, 200, {
        ok: true,
        count: collections.length,
        collections,
      })
    }

    if (request.method === "GET" && url.pathname === "/portfolios") {
      const portfolios = getPortfolioIds().map((portfolioId) => createPortfolio(portfolioId, getEntriesForPortfolio(portfolioId)))
      return json(response, 200, {
        ok: true,
        count: portfolios.length,
        portfolios,
      })
    }

    if (request.method === "GET" && url.pathname === "/receipts") {
      const receipts = getReceiptIds()
      return json(response, 200, {
        ok: true,
        count: receipts.length,
        receipts,
      })
    }

    if (request.method === "GET" && url.pathname === "/export") {
      return json(response, 200, createChronicleBundle("all", entryStore))
    }

    if (request.method === "GET" && url.pathname.startsWith("/project/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      const projectRef = parts[1] ? decodeURIComponent(parts[1]) : ""
      const projectEntries = getEntriesForProject(projectRef)
      const projectTimeline = buildTimeline(projectEntries, {
        timeline_id: `chronicle-project-${projectRef}-timeline`,
        title: `Chronicle Project Timeline: ${projectRef}`,
      })

      if (parts.length === 2) {
        return json(response, 200, {
          ok: true,
          project_ref: projectRef,
          count: projectEntries.length,
          entries: projectEntries,
          timeline: projectTimeline,
        })
      }

      if (parts.length === 3 && parts[2] === "view") {
        return html(response, 200, renderHtmlView(projectTimeline, {
          heading: `Chronicle Project History: ${projectRef}`,
          lead: `A project-filtered browser view for ${projectRef}.`,
          backLink: "/view",
        }))
      }

      if (parts.length === 3 && parts[2] === "export") {
        return json(response, 200, createChronicleBundle(projectRef, projectEntries))
      }
    }

    if (request.method === "GET" && url.pathname.startsWith("/release/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      const releaseId = parts[1] ? decodeURIComponent(parts[1]) : ""
      const releaseEntries = getEntriesForRelease(releaseId)
      const releaseTimeline = buildTimeline(releaseEntries, {
        timeline_id: `chronicle-release-${releaseId}-timeline`,
        title: `Chronicle Release Timeline: ${releaseId}`,
      })

      if (parts.length === 2) {
        return json(response, 200, {
          ok: true,
          release_id: releaseId,
          count: releaseEntries.length,
          entries: releaseEntries,
          timeline: releaseTimeline,
        })
      }

      if (parts.length === 3 && parts[2] === "view") {
        return html(response, 200, renderHtmlView(releaseTimeline, {
          heading: `Chronicle Release History: ${releaseId}`,
          lead: `A release-filtered browser view for ${releaseId}.`,
          backLink: "/view",
        }))
      }

      if (parts.length === 3 && parts[2] === "export") {
        return json(response, 200, createChronicleBundle(releaseId, releaseEntries))
      }
    }

    if (request.method === "GET" && url.pathname.startsWith("/profile/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      const profileId = parts[1] ? decodeURIComponent(parts[1]) : ""
      const profileEntries = getEntriesForProfile(profileId)
      const profileTimeline = buildTimeline(profileEntries, {
        timeline_id: `chronicle-profile-${profileId}-timeline`,
        title: `Chronicle Profile Timeline: ${profileId}`,
      })

      if (parts.length === 2) {
        return json(response, 200, {
          ok: true,
          profile_id: profileId,
          count: profileEntries.length,
          entries: profileEntries,
          timeline: profileTimeline,
        })
      }

      if (parts.length === 3 && parts[2] === "view") {
        return html(response, 200, renderHtmlView(profileTimeline, {
          heading: `Chronicle Profile History: ${profileId}`,
          lead: `A profile-filtered browser view for ${profileId}.`,
          backLink: "/view",
        }))
      }

      if (parts.length === 3 && parts[2] === "export") {
        return json(response, 200, createChronicleBundle(profileId, profileEntries))
      }
    }

    if (request.method === "GET" && url.pathname.startsWith("/receipt/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      const receiptId = parts[1] ? decodeURIComponent(parts[1]) : ""
      const receiptEntries = getEntriesForReceipt(receiptId)
      const receipt = createReceiptView(receiptId, receiptEntries)

      if (parts.length === 2) {
        return json(response, 200, {
          ok: true,
          ...receipt,
        })
      }

      if (parts.length === 3 && parts[2] === "view") {
        return html(response, 200, renderReceiptHtml(receipt))
      }
    }

    if (request.method === "GET" && url.pathname.startsWith("/portfolio/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      const portfolioId = parts[1] ? decodeURIComponent(parts[1]) : ""
      const portfolioEntries = getEntriesForPortfolio(portfolioId)
      const portfolio = createPortfolio(portfolioId, portfolioEntries)

      if (parts.length === 2) {
        return json(response, 200, portfolio)
      }

      if (parts.length === 3 && parts[2] === "export") {
        return json(response, 200, {
          ...portfolio,
          entries: portfolioEntries,
        })
      }

      if (parts.length === 3 && parts[2] === "view") {
        return html(response, 200, renderPortfolioHtml(portfolioId, portfolio))
      }
    }

    if (request.method === "GET" && url.pathname.startsWith("/collection/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      const collectionId = parts[1] ? decodeURIComponent(parts[1]) : ""
      const collectionEntries = getEntriesForCollection(collectionId)
      const collection = createCollection(collectionId, collectionEntries)

      if (parts.length === 2) {
        return json(response, 200, collection)
      }

      if (parts.length === 3 && parts[2] === "export") {
        return json(response, 200, {
          ...collection,
          entries: collectionEntries,
        })
      }

      if (parts.length === 3 && parts[2] === "view") {
        return html(response, 200, renderCollectionHtml(collectionId, collection))
      }
    }

    if (request.method === "GET" && url.pathname.startsWith("/position/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      const positionId = parts[1] ? decodeURIComponent(parts[1]) : ""
      const positionEntries = getEntriesForPosition(positionId)
      const positionTimeline = buildTimeline(positionEntries, {
        timeline_id: `chronicle-position-${positionId}-timeline`,
        title: `Chronicle Position Timeline: ${positionId}`,
      })
      const summary = createPositionSummary(positionEntries)

      if (parts.length === 2) {
        return json(response, 200, {
          ok: true,
          position_id: positionId,
          summary,
          count: positionEntries.length,
          entries: positionEntries,
          timeline: positionTimeline,
        })
      }

      if (parts.length === 3 && parts[2] === "view") {
        return html(response, 200, renderHtmlView(positionTimeline, {
          heading: `Chronicle Position History: ${positionId}`,
          lead: `A position-filtered browser view for ${positionId}. Event count: ${summary.event_count}. Proof objects: ${summary.proof_object_count}. Projects: ${summary.project_count}. Releases: ${summary.release_count}. Profiles: ${summary.profile_count}. First event: ${summary.first_event_at ?? "n/a"}. Latest event: ${summary.latest_event_at ?? "n/a"}. Active days: ${summary.active_days}.`,
          backLink: "/view",
          positionId,
        }))
      }

      if (parts.length === 3 && parts[2] === "scorecard") {
        return json(response, 200, {
          ok: true,
          position_id: positionId,
          summary,
        })
      }

      if (parts.length === 4 && parts[2] === "scorecard" && parts[3] === "view") {
        return html(response, 200, renderScorecardHtml(positionId, summary))
      }

      if (parts.length === 3 && parts[2] === "evolution") {
        return json(response, 200, {
          ok: true,
          position_id: positionId,
          evolution: createPositionEvolution(positionEntries),
        })
      }

      if (parts.length === 4 && parts[2] === "evolution" && parts[3] === "view") {
        return html(response, 200, renderEvolutionHtml(positionId, createPositionEvolution(positionEntries)))
      }

      if (parts.length === 3 && parts[2] === "snapshot") {
        return json(response, 200, createPositionSnapshot(positionId, positionEntries))
      }

      if (parts.length === 3 && parts[2] === "lineage") {
        return json(response, 200, {
          ok: true,
          position_id: positionId,
          lineage: createPositionLineage(positionId, positionEntries),
        })
      }

      if (parts.length === 4 && parts[2] === "lineage" && parts[3] === "view") {
        return html(response, 200, renderLineageHtml(positionId, createPositionLineage(positionId, positionEntries)))
      }

      if (parts.length === 3 && parts[2] === "artifact") {
        return json(response, 200, createPositionArtifact(positionId, positionEntries))
      }

      if (parts.length === 4 && parts[2] === "artifact" && parts[3] === "view") {
        return html(response, 200, renderArtifactHtml(positionId, createPositionArtifact(positionId, positionEntries)))
      }

      if (parts.length === 3 && parts[2] === "export") {
        return json(response, 200, {
          ...createChronicleBundle(positionId, positionEntries),
          position_summary: summary,
        })
      }
    }

    if (request.method === "GET" && url.pathname === "/timeline") {
      return json(response, 200, buildTimeline())
    }

    if (request.method === "GET" && url.pathname === "/chronicle.md") {
      return text(response, 200, renderMarkdownTimeline(buildTimeline()))
    }

    if (request.method === "GET" && url.pathname === "/view") {
      return html(response, 200, renderHtmlView(buildTimeline()))
    }

    return json(response, 404, { ok: false, error: "Not found" })
  } catch (error) {
    return json(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, () => {
    console.log(`Chronicle local node listening on http://localhost:${PORT}`)
    console.log(`Persistent store: ${STORE_PATH}`)
    console.log("Endpoints: GET /health, POST /entries, POST /import/receipt, POST /import/receipt-timeline, POST /import/bundle, GET /entries, GET /projects, GET /releases, GET /profiles, GET /positions, GET /collections, GET /portfolios, GET /receipts, GET /export, GET /project/:project_ref, GET /project/:project_ref/export, GET /release/:release_id, GET /release/:release_id/export, GET /profile/:profile_id, GET /profile/:profile_id/export, GET /receipt/:receipt_id, GET /portfolio/:portfolio_id, GET /portfolio/:portfolio_id/export, GET /portfolio/:portfolio_id/view, GET /collection/:collection_id, GET /collection/:collection_id/export, GET /collection/:collection_id/view, GET /position/:position_id, GET /position/:position_id/scorecard, GET /position/:position_id/evolution, GET /position/:position_id/snapshot, GET /position/:position_id/lineage, GET /position/:position_id/artifact, GET /position/:position_id/export, GET /timeline, GET /chronicle.md, GET /view")
  })
}
