import test from "node:test"
import assert from "node:assert/strict"
// This suite tests portfolio_root math over opaque entry_id refs only; it
// does not exercise or claim ReceiptOS admission. It deliberately calls the
// internal field-mapping builder directly (white-box fixture construction)
// rather than the public admission gate, which requires real evidence.
import { buildChronicleEntryV0FromAdmittedProofObject } from "../src/chronicle_entry.mjs"
import {
  computeChroniclePortfolioRootV0,
  createChroniclePortfolioV0,
  verifyChroniclePortfolioV0,
} from "../src/chronicle_portable_history.mjs"

const baseProofObject = {
  schema: "receiptos.portable_proof_object.v0",
  proof_object_id: "proofobj-alpha",
  proof_system: "ReceiptOS",
  receipt_root: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  proof_ref: "receiptos://portable-proof-object/proofobj-alpha",
  replay_ref: "receiptos://replay/alpha",
  anchor_ref: null,
  created_at: "2026-06-29T12:00:00.000Z",
  relation_type: "imported",
  project_refs: ["workspace"],
  source_evidence_ref: "example://alpha.json",
  producer: { runtime: "Stealth", agent_id: null, generated_by: null, source_schema: "stealth.session.evidence.v1" },
  metadata: { label: "Alpha", session_id: "alpha", directory: "C:/demo/a", position_id: "workspace" },
  evidence_capsule: { schema: "receiptos.evidence_capsule.v0" },
  provenance_summary: { schema: "receiptos.provenance_summary.v0" },
}

function makeEntry(proofObjectId) {
  return buildChronicleEntryV0FromAdmittedProofObject({
    ...baseProofObject,
    proof_object_id: proofObjectId,
    proof_ref: `receiptos://portable-proof-object/${proofObjectId}`,
  })
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
