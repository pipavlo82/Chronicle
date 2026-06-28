import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { computeArtifactRootV0 } from "../src/chronicle_position_artifact.mjs"
import { computeCollectionRootV0 } from "../src/chronicle_collection.mjs"
import { computePortfolioRootV0 } from "../src/chronicle_portfolio.mjs"
import { createCollection, createPortfolio, createPositionArtifact, createPositionSnapshot, renderArtifactHtml, renderCollectionHtml, renderPortfolioHtml } from "../scripts/run_chronicle_node.mjs"

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

const collectionEntries = [
  ...baseEntries,
  makeEntry({ entryId: "entry-003", createdAt: "2026-06-03T12:00:00.000Z", positionId: "position-beta", receiptId: "receipt-003" }),
]

const portfolioEntries = [
  makeEntry({ entryId: "entry-010", createdAt: "2026-06-01T09:00:00.000Z", positionId: "portfolio-alpha", receiptId: "receipt-010" }),
  {
    ...makeEntry({ entryId: "entry-011", createdAt: "2026-06-02T09:00:00.000Z", positionId: "portfolio-alpha", receiptId: "receipt-011" }),
    project_refs: ["collection-beta"],
  },
  {
    ...makeEntry({ entryId: "entry-012", createdAt: "2026-06-03T09:00:00.000Z", positionId: "portfolio-alpha", receiptId: "receipt-012" }),
    project_refs: ["collection-alpha"],
  },
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

test("artifact view displays full artifact_root in a wrapping block", () => {
  const artifact = createPositionArtifact("position-alpha", baseEntries)
  const html = renderArtifactHtml("position-alpha", artifact)
  assert.match(html, new RegExp(artifact.artifact_root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(html, /artifact-root-block/)
  assert.doesNotMatch(html, /<div class="metric"><strong>artifact_root<\/strong>/)
  assert.match(html, /overflow-wrap: anywhere;/)
  assert.match(html, /word-break: break-word;/)
})

test("snapshot output includes artifact_root", () => {
  const snapshot = createPositionSnapshot("position-alpha", baseEntries)
  assert.equal(snapshot.artifact_version, "chronicle.position_artifact.v0")
  assert.match(snapshot.artifact_root, /^sha256:[0-9a-f]{64}$/)
})

test("artifact_root remains stable across repeated artifact and snapshot generation", () => {
  const artifactA = createPositionArtifact("position-alpha", baseEntries)
  const artifactB = createPositionArtifact("position-alpha", baseEntries)
  const snapshotA = createPositionSnapshot("position-alpha", baseEntries)
  const snapshotB = createPositionSnapshot("position-alpha", baseEntries)

  assert.equal(artifactA.artifact_root, artifactB.artifact_root)
  assert.equal(snapshotA.artifact_root, snapshotB.artifact_root)
  assert.equal(artifactA.artifact_root, snapshotA.artifact_root)
  assert.equal(artifactB.artifact_root, snapshotB.artifact_root)
})

test("same collection identity input produces the same collection_root", () => {
  const input = {
    collection_version: "chronicle.collection.v0",
    collection_id: "project-chronicle-core",
    artifact_refs: ["/position/position-beta/artifact", "/position/position-alpha/artifact"],
  }

  assert.equal(computeCollectionRootV0(input), computeCollectionRootV0(input))
})

test("changing artifact_refs changes collection_root", () => {
  const base = computeCollectionRootV0({
    collection_version: "chronicle.collection.v0",
    collection_id: "project-chronicle-core",
    artifact_refs: ["/position/position-alpha/artifact", "/position/position-beta/artifact"],
  })
  const changed = computeCollectionRootV0({
    collection_version: "chronicle.collection.v0",
    collection_id: "project-chronicle-core",
    artifact_refs: ["/position/position-alpha/artifact", "/position/position-gamma/artifact"],
  })

  assert.notEqual(base, changed)
})

test("artifact_refs ordering does not affect collection_root", () => {
  const a = computeCollectionRootV0({
    collection_version: "chronicle.collection.v0",
    collection_id: "project-chronicle-core",
    artifact_refs: ["/position/position-beta/artifact", "/position/position-alpha/artifact"],
  })
  const b = computeCollectionRootV0({
    collection_version: "chronicle.collection.v0",
    collection_id: "project-chronicle-core",
    artifact_refs: ["/position/position-alpha/artifact", "/position/position-beta/artifact"],
  })

  assert.equal(a, b)
})

test("collection export includes collection_root", () => {
  const collection = createCollection("position-alpha", baseEntries)
  const exportPayload = {
    ...collection,
    entries: baseEntries,
  }

  assert.equal(exportPayload.collection_id, "position-alpha")
  assert.equal(exportPayload.collection_version, "chronicle.collection.v0")
  assert.equal(exportPayload.artifact_count, collection.artifact_count)
  assert.deepEqual(exportPayload.artifact_refs, collection.artifact_refs)
  assert.match(exportPayload.collection_root, /^sha256:[0-9a-f]{64}$/)
})

test("collection root remains stable across repeated generation", () => {
  const collectionA = createCollection("position-alpha", collectionEntries)
  const collectionB = createCollection("position-alpha", collectionEntries)

  assert.equal(collectionA.collection_root, collectionB.collection_root)
  assert.deepEqual(collectionA.artifact_refs, collectionB.artifact_refs)
})

test("collection view displays full collection_root in a wrapping block", () => {
  const collection = createCollection("position-alpha", collectionEntries)
  const html = renderCollectionHtml("position-alpha", collection)

  assert.match(html, new RegExp(collection.collection_root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(html, /root-block/)
  assert.match(html, /overflow-wrap: anywhere;/)
  assert.match(html, /word-break: break-word;/)
  assert.match(html, /collection_id/)
  assert.match(html, /collection_version/)
  assert.match(html, /artifact_count/)
  assert.match(html, /artifact_refs/)
})

test("collection output recomputes root from sorted artifact refs only", () => {
  const collection = createCollection("position-alpha", collectionEntries)
  assert.deepEqual(collection.artifact_refs, ["/position/position-alpha/artifact", "/position/position-beta/artifact"])
  assert.equal(collection.artifact_count, 2)
  assert.equal(collection.first_seen, "2026-06-01T12:00:00.000Z")
  assert.equal(collection.latest_seen, "2026-06-03T12:00:00.000Z")
})

test("/position/:id/artifact and /position/:id/snapshot routes return outputs with artifact_root", () => {
  const source = fs.readFileSync(path.join(repoRoot, "scripts", "run_chronicle_node.mjs"), "utf8")
  assert.match(
    source,
    /if \(parts\.length === 3 && parts\[2\] === "artifact"\) \{\s+return json\(response, 200, createPositionArtifact\(positionId, positionEntries\)\)/s,
  )
  assert.match(
    source,
    /if \(parts\.length === 3 && parts\[2\] === "snapshot"\) \{\s+return json\(response, 200, createPositionSnapshot\(positionId, positionEntries\)\)/s,
  )

  const artifact = createPositionArtifact("position-alpha", baseEntries)
  const snapshot = createPositionSnapshot("position-alpha", baseEntries)
  assert.match(artifact.artifact_root, /^sha256:[0-9a-f]{64}$/)
  assert.match(snapshot.artifact_root, /^sha256:[0-9a-f]{64}$/)
})

test("same portfolio identity input produces the same portfolio_root", () => {
  const input = {
    portfolio_version: "chronicle.portfolio.v0",
    portfolio_id: "portfolio-alpha",
    collection_refs: ["/collection/collection-beta", "/collection/collection-alpha"],
  }

  assert.equal(computePortfolioRootV0(input), computePortfolioRootV0(input))
})

test("changing collection_refs changes portfolio_root", () => {
  const base = computePortfolioRootV0({
    portfolio_version: "chronicle.portfolio.v0",
    portfolio_id: "portfolio-alpha",
    collection_refs: ["/collection/collection-alpha", "/collection/collection-beta"],
  })
  const changed = computePortfolioRootV0({
    portfolio_version: "chronicle.portfolio.v0",
    portfolio_id: "portfolio-alpha",
    collection_refs: ["/collection/collection-alpha", "/collection/collection-gamma"],
  })

  assert.notEqual(base, changed)
})

test("collection_refs ordering does not affect portfolio_root", () => {
  const a = computePortfolioRootV0({
    portfolio_version: "chronicle.portfolio.v0",
    portfolio_id: "portfolio-alpha",
    collection_refs: ["/collection/collection-beta", "/collection/collection-alpha"],
  })
  const b = computePortfolioRootV0({
    portfolio_version: "chronicle.portfolio.v0",
    portfolio_id: "portfolio-alpha",
    collection_refs: ["/collection/collection-alpha", "/collection/collection-beta"],
  })

  assert.equal(a, b)
})

test("derived overlays do not change portfolio_root", () => {
  const base = computePortfolioRootV0({
    portfolio_version: "chronicle.portfolio.v0",
    portfolio_id: "portfolio-alpha",
    collection_refs: ["/collection/collection-alpha", "/collection/collection-beta"],
  })
  const withDerivedOverlays = computePortfolioRootV0({
    portfolio_version: "chronicle.portfolio.v0",
    portfolio_id: "portfolio-alpha",
    collection_refs: ["/collection/collection-beta", "/collection/collection-alpha"],
    snapshots: { count: 2 },
    lineage: { summary: true },
    scorecard: { score: 99 },
    rendered_at: "2026-06-27T00:00:00.000Z",
    ownership: { claim: false },
  })

  assert.equal(base, withDerivedOverlays)
})

test("portfolio view displays full portfolio_root", () => {
  const portfolio = createPortfolio("portfolio-alpha", portfolioEntries)
  const html = renderPortfolioHtml("portfolio-alpha", portfolio)

  assert.match(html, new RegExp(portfolio.portfolio_root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(html, /root-block/)
  assert.match(html, /overflow-wrap: anywhere;/)
  assert.match(html, /word-break: break-word;/)
  assert.match(html, /portfolio_id/)
  assert.match(html, /portfolio_version/)
  assert.match(html, /collection_count/)
  assert.match(html, /artifact_count/)
  assert.match(html, /collection_refs/)
})

test("portfolio export includes portfolio_root", () => {
  const portfolio = createPortfolio("portfolio-alpha", portfolioEntries)
  const exportPayload = {
    ...portfolio,
    entries: portfolioEntries,
  }

  assert.equal(exportPayload.portfolio_id, "portfolio-alpha")
  assert.equal(exportPayload.portfolio_version, "chronicle.portfolio.v0")
  assert.equal(exportPayload.collection_count, portfolio.collection_count)
  assert.equal(exportPayload.artifact_count, portfolio.artifact_count)
  assert.deepEqual(exportPayload.collection_refs, portfolio.collection_refs)
  assert.match(exportPayload.portfolio_root, /^sha256:[0-9a-f]{64}$/)
})

test("/collections and /collection routes are wired", () => {
  const source = fs.readFileSync(path.join(repoRoot, "scripts", "run_chronicle_node.mjs"), "utf8")
  assert.match(source, /if \(request\.method === "GET" && url\.pathname === "\/collections"\)/)
  assert.match(source, /if \(request\.method === "GET" && url\.pathname\.startsWith\("\/collection\/"\)\)/)
  assert.match(source, /if \(parts\.length === 3 && parts\[2\] === "export"\) \{\s+return json\(response, 200, \{\s+\.\.\.collection,/s)
  assert.match(source, /if \(parts\.length === 3 && parts\[2\] === "view"\) \{\s+return html\(response, 200, renderCollectionHtml\(collectionId, collection\)\)/s)
})

test("/portfolios and /portfolio routes are wired", () => {
  const source = fs.readFileSync(path.join(repoRoot, "scripts", "run_chronicle_node.mjs"), "utf8")
  assert.match(source, /if \(request\.method === "GET" && url\.pathname === "\/portfolios"\)/)
  assert.match(source, /if \(request\.method === "GET" && url\.pathname\.startsWith\("\/portfolio\/"\)\)/)
  assert.match(source, /if \(parts\.length === 3 && parts\[2\] === "export"\) \{\s+return json\(response, 200, \{\s+\.\.\.portfolio,/s)
  assert.match(source, /if \(parts\.length === 3 && parts\[2\] === "view"\) \{\s+return html\(response, 200, renderPortfolioHtml\(portfolioId, portfolio\)\)/s)
})
