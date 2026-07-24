import test from "node:test"
import assert from "node:assert/strict"
import {
  computeChroniclePortfolioRootV0,
  createChroniclePortfolioV0,
  verifyChroniclePortfolioV0,
} from "../src/chronicle_portable_history.mjs"
// Aggregate tests treat Chronicle Entries as opaque, already-admitted inputs.
// They verify only portfolio reference-set math and make no member-validity claim.

function makeEntry(proofObjectId) {
  return {
    schema: "chronicle_entry.v0",
    entry_id: `entry-${proofObjectId}`,
    source_system: "ReceiptOS",
    receipt_root: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    proof_object_ref: `receiptos://portable-proof-object/${proofObjectId}`,
    evidence_capsule_ref: `embedded:${proofObjectId}:evidence_capsule`,
    provenance_summary_ref: `embedded:${proofObjectId}:provenance_summary`,
    created_from: "test-fixture://opaque-entry",
    labels: [],
    notes: null,
  }
}

test("stable portfolio_root with sorted collection_refs", () => {
  const entries = [makeEntry("proofobj-c"), makeEntry("proofobj-a"), makeEntry("proofobj-b")]
  const portfolioA = createChroniclePortfolioV0(entries, { portfolioId: "portable-work-history" })
  const portfolioB = createChroniclePortfolioV0(entries, { portfolioId: "portable-work-history" })
  assert.equal(portfolioA.portfolio_root, portfolioB.portfolio_root)
})

test("different ordering produces same portfolio_root", () => {
  const a = computeChroniclePortfolioRootV0({
    portfolio_version: "chronicle_portfolio.v0",
    portfolio_id: "portable-work-history",
    collection_refs: ["entry-proofobj-c", "entry-proofobj-a", "entry-proofobj-b"],
  })
  const b = computeChroniclePortfolioRootV0({
    portfolio_version: "chronicle_portfolio.v0",
    portfolio_id: "portable-work-history",
    collection_refs: ["entry-proofobj-a", "entry-proofobj-b", "entry-proofobj-c"],
  })
  assert.equal(a, b)
})

test("changing a collection_ref changes portfolio_root", () => {
  const a = computeChroniclePortfolioRootV0({
    portfolio_version: "chronicle_portfolio.v0",
    portfolio_id: "portable-work-history",
    collection_refs: ["entry-proofobj-a", "entry-proofobj-b"],
  })
  const b = computeChroniclePortfolioRootV0({
    portfolio_version: "chronicle_portfolio.v0",
    portfolio_id: "portable-work-history",
    collection_refs: ["entry-proofobj-a", "entry-proofobj-c"],
  })
  assert.notEqual(a, b)
})

test("metadata and render changes do not change portfolio_root", () => {
  const a = computeChroniclePortfolioRootV0({
    portfolio_version: "chronicle_portfolio.v0",
    portfolio_id: "portable-work-history",
    collection_refs: ["entry-proofobj-a", "entry-proofobj-b"],
  })
  const b = computeChroniclePortfolioRootV0({
    portfolio_version: "chronicle_portfolio.v0",
    portfolio_id: "portable-work-history",
    collection_refs: ["entry-proofobj-b", "entry-proofobj-a"],
    render_timestamp: "2026-06-29T00:00:00.000Z",
    scorecard: { score: 10 },
    reputation: { tier: "gold" },
    ownership: { holder: "none" },
  })
  assert.equal(a, b)
})

test("verifyChroniclePortfolioV0 recomputes portfolio_root", () => {
  const portfolio = createChroniclePortfolioV0([makeEntry("proofobj-a"), makeEntry("proofobj-b")], { portfolioId: "portable-work-history" })
  const result = verifyChroniclePortfolioV0(portfolio)
  assert.equal(result.ok, true)
  assert.equal(result.portfolio_root, result.recomputed_portfolio_root)
})
