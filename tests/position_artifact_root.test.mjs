import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { computeArtifactRootV0 } from "../src/chronicle_position_artifact.mjs"
import { createPositionArtifact, renderArtifactHtml } from "../scripts/run_chronicle_node.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")

function makeEntry({ entryId, createdAt, positionId = "position-alpha", receiptId }) {
  return {
    entry_id: entryId,
    created_at: createdAt,
    project_refs: [positionId],
    proof_object_refs: [
      {
        proof_object_id: receiptId,
        proof_system: "ReceiptOS",
      },
    ],
    metadata: {
      label: entryId,
      position_id: positionId,
      release: "release-1",
      profile_id: "profile-1",
      source_bundle_scope: "bundle-alpha",
    },
  }
}

const baseEntries = [
  makeEntry({ entryId: "entry-002", createdAt: "2026-06-02T12:00:00.000Z", receiptId: "receipt-002" }),
  makeEntry({ entryId: "entry-001", createdAt: "2026-06-01T12:00:00.000Z", receiptId: "receipt-001" }),
]

test("same artifact identity input produces the same artifact_root", () => {
  const input = {
    artifact_version: "chronicle.position_artifact.v0",
    artifact_scope: "position",
    position_id: "position-alpha",
    entry_refs: ["entry-002", "entry-001"],
    receipt_refs: ["receipt-002", "receipt-001"],
  }

  assert.equal(computeArtifactRootV0(input), computeArtifactRootV0(input))
})

test("changing entry refs changes artifact_root", () => {
  const base = computeArtifactRootV0({
    artifact_version: "chronicle.position_artifact.v0",
    artifact_scope: "position",
    position_id: "position-alpha",
    entry_refs: ["entry-001", "entry-002"],
    receipt_refs: ["receipt-001", "receipt-002"],
  })
  const changed = computeArtifactRootV0({
    artifact_version: "chronicle.position_artifact.v0",
    artifact_scope: "position",
    position_id: "position-alpha",
    entry_refs: ["entry-001", "entry-003"],
    receipt_refs: ["receipt-001", "receipt-002"],
  })

  assert.notEqual(base, changed)
})

test("changing receipt refs changes artifact_root", () => {
  const base = computeArtifactRootV0({
    artifact_version: "chronicle.position_artifact.v0",
    artifact_scope: "position",
    position_id: "position-alpha",
    entry_refs: ["entry-001", "entry-002"],
    receipt_refs: ["receipt-001", "receipt-002"],
  })
  const changed = computeArtifactRootV0({
    artifact_version: "chronicle.position_artifact.v0",
    artifact_scope: "position",
    position_id: "position-alpha",
    entry_refs: ["entry-001", "entry-002"],
    receipt_refs: ["receipt-001", "receipt-003"],
  })

  assert.notEqual(base, changed)
})

test("derived overlays do not change artifact_root", () => {
  const base = computeArtifactRootV0({
    artifact_version: "chronicle.position_artifact.v0",
    artifact_scope: "position",
    position_id: "position-alpha",
    entry_refs: ["entry-001", "entry-002"],
    receipt_refs: ["receipt-001", "receipt-002"],
  })
  const withDerivedOverlays = computeArtifactRootV0({
    artifact_version: "chronicle.position_artifact.v0",
    artifact_scope: "position",
    position_id: "position-alpha",
    entry_refs: ["entry-002", "entry-001"],
    receipt_refs: ["receipt-002", "receipt-001"],
    scorecard: { event_count: 99 },
    evolution: { point_count: 3 },
    snapshot: { generated_at: "2026-06-27T00:00:00.000Z" },
    lineage: { source_entries: ["other"] },
    html: "<b>derived</b>",
    snapshot_link: "/position/position-alpha/snapshot",
    rendered_at: "2026-06-27T00:00:00.000Z",
  })

  assert.equal(base, withDerivedOverlays)
})

test("artifact_root is present in position artifact output", () => {
  const artifact = createPositionArtifact("position-alpha", baseEntries)
  assert.match(artifact.artifact_root, /^sha256:[0-9a-f]{64}$/)
  assert.equal(artifact.artifact_version, "chronicle.position_artifact.v0")
})

test("artifact view displays artifact_root", () => {
  const artifact = createPositionArtifact("position-alpha", baseEntries)
  const html = renderArtifactHtml("position-alpha", artifact)
  assert.match(html, new RegExp(artifact.artifact_root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
})

test("/position/:id/artifact route returns artifact output with artifact_root", () => {
  const source = fs.readFileSync(path.join(repoRoot, "scripts", "run_chronicle_node.mjs"), "utf8")
  assert.match(
    source,
    /if \(parts\.length === 3 && parts\[2\] === "artifact"\) \{\s+return json\(response, 200, createPositionArtifact\(positionId, positionEntries\)\)/s,
  )

  const artifact = createPositionArtifact("position-alpha", baseEntries)
  assert.match(artifact.artifact_root, /^sha256:[0-9a-f]{64}$/)
})
