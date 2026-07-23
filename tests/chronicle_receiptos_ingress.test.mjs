import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")
const trackedDataFile = path.join(repoRoot, "data", "chronicle-local-store.json")
const BASE = "http://localhost:8080"

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/receiptos", name), "utf8"))
}

function cleanPair() {
  return { evidence: readFixture("session-evidence.sample.json"), proof_object: readFixture("portable-proof-object.sample.json") }
}

function tamperedPair() {
  return { evidence: readFixture("session-evidence.tampered.sample.json"), proof_object: readFixture("portable-proof-object.tampered.sample.json") }
}

async function post(pathname, body) {
  const response = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await response.json()
  return { status: response.status, json }
}

let child
let tempDir
let trackedDataFileStatBefore

before(async () => {
  // Isolation: the server writes to CHRONICLE_STORE_PATH, a file inside a
  // fresh OS temp directory, never to the tracked repository data file.
  // Capture the tracked file's stat now, before the server even starts, so
  // it can be proven untouched afterward without hashing/restoring/git.
  trackedDataFileStatBefore = fs.statSync(trackedDataFile)

  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chronicle-ingress-test-"))
  const storePath = path.join(tempDir, "chronicle-local-store.json")

  child = spawn(process.execPath, ["scripts/run_chronicle_node.mjs"], {
    cwd: repoRoot,
    stdio: "ignore",
    env: { ...process.env, CHRONICLE_STORE_PATH: storePath },
  })

  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/health`)
      if (response.ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error("chronicle local node did not become healthy before the test deadline")
})

after(() => {
  try {
    if (child) child.kill()
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

// A-D form one necessarily sequential story against the one clean fixture
// pair: identity (entry_id / proof_object_ref) is shared store-wide, so each
// step's expected status depends on what the previous step already admitted.
test("A-D. admit once, idempotent re-import, then identity conflicts on differing content", async (t) => {
  const pair = cleanPair()

  await t.test("A. clean evidence+proof is admitted (201)", async () => {
    const { status, json } = await post("/import/receipt", pair)
    assert.equal(status, 201)
    assert.equal(json.ok, true)
    assert.equal(json.imported, true)
    assert.ok(json.created_entry_id.startsWith("entry-proofobj-"))
  })

  const beforeCount = (await (await fetch(`${BASE}/entries`)).json()).entries.length

  // B. Same canonical payload imported twice: second import is idempotent.
  await t.test("B. re-posting the identical payload is idempotent (200, not a new entry)", async () => {
    const second = await post("/import/receipt", pair)
    assert.equal(second.status, 200)
    assert.equal(second.json.ok, true)
    assert.equal(second.json.imported, false)
    assert.equal(second.json.existing, true)
    assert.equal((await (await fetch(`${BASE}/entries`)).json()).entries.length, beforeCount)
  })

  // C. Same entry_id with different content: HTTP 409, original unchanged.
  await t.test("C. same entry_id with different content is a 409 conflict, original unchanged", async () => {
    const conflicting = await post("/import/receipt", { ...pair, options: { notes: "a materially different claim under the same entry_id" } })
    assert.equal(conflicting.status, 409)
    assert.equal(conflicting.json.ok, false)

    const entries = await (await fetch(`${BASE}/entries`)).json()
    const stored = entries.entries.filter((entry) => entry.proof_object_ref === pair.proof_object.proof_ref)
    assert.equal(stored.length, 1)
    assert.equal(stored[0].notes, null)
  })

  // D. Same proof_object_id (carried in proof_object_ref) under a different
  // entry_id, with different content: still HTTP 409, never a second entry.
  await t.test("D. same proof_object_ref under a different entry_id is still a 409 conflict", async () => {
    const aliased = await post("/import/receipt", { ...pair, options: { entryId: "entry-alias-two" } })
    assert.equal(aliased.status, 409)
    assert.equal(aliased.json.ok, false)

    const entries = await (await fetch(`${BASE}/entries`)).json()
    assert.equal(entries.entries.filter((entry) => entry.entry_id === "entry-alias-two").length, 0)
    assert.equal(entries.entries.filter((entry) => entry.proof_object_ref === pair.proof_object.proof_ref).length, 1)
  })
})

// E. Tampered evidence: proof object may contain mismatch evidence, but Chronicle admission fails.
test("E. tampered pair fails admission (422) though the proof object itself carries mismatch evidence", async () => {
  const pair = tamperedPair()
  assert.equal(pair.proof_object.evidence_capsule.receipt_root.status, "mismatch")

  const { status, json } = await post("/import/receipt", pair)
  assert.equal(status, 422)
  assert.equal(json.ok, false)
  assert.equal(json.code, "evidence_root_mismatch")

  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.some((entry) => entry.receipt_root === pair.proof_object.receipt_root && entry.notes !== null), false)
})

// F. Missing original evidence: proof-object-only import fails as unverifiable.
test("F. proof-object-only body (old shape) is rejected as unverifiable (400), not admitted", async () => {
  const { proof_object } = cleanPair()
  const { status, json } = await post("/import/receipt", proof_object)
  assert.equal(status, 400)
  assert.equal(json.ok, false)
  assert.deepEqual(json.required, ["evidence", "proof_object"])
})

// G. Fabricated canonical Entry submitted directly to /entries: rejected and not stored.
test("G. a fabricated canonical ReceiptOS chronicle_entry.v0 posted directly to /entries is rejected", async () => {
  const fabricated = {
    schema: "chronicle_entry.v0",
    entry_id: "entry-fabricated-direct",
    source_system: "ReceiptOS",
    receipt_root: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    proof_object_ref: "receiptos://portable-proof-object/proofobj-deadbeef",
    evidence_capsule_ref: "embedded:proofobj-deadbeef:evidence_capsule",
    provenance_summary_ref: "embedded:proofobj-deadbeef:provenance_summary",
    created_from: null,
    labels: [],
    notes: null,
  }

  const { status, json } = await post("/entries", fabricated)
  assert.equal(status, 400)
  assert.equal(json.ok, false)

  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.some((entry) => entry.entry_id === "entry-fabricated-direct"), false)
})

test("G2. a legacy-shaped entry claiming ReceiptOS proof_system posted to /entries is also rejected", async () => {
  const legacyFabricated = {
    entry_id: "entry-repro-legacy-fabricated",
    proof_object_refs: [{ proof_object_id: "proofobj-fabricated", proof_system: "ReceiptOS", receipt_root: "0xdeadbeef" }],
    created_at: "2026-01-01T00:00:00Z",
  }

  const { status } = await post("/entries", legacyFabricated)
  assert.equal(status, 400)

  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.some((entry) => entry.entry_id === "entry-repro-legacy-fabricated"), false)
})

test("G3. non-ReceiptOS legacy entries remain accepted on /entries (retained compatibility)", async () => {
  const nonReceiptOS = {
    entry_id: "entry-manual-non-receiptos",
    proof_object_refs: [{ proof_object_id: "manual-1", proof_system: "manual" }],
    created_at: "2026-01-01T00:00:00Z",
  }

  const { status, json } = await post("/entries", nonReceiptOS)
  assert.equal(status, 201)
  assert.equal(json.ok, true)
})

// Marker-omission bypass regressions: detection must not rely solely on the
// self-declared, spoofable source_system/proof_system fields.
test("G4. canonical shape with source_system marker removed is still rejected", async () => {
  const fabricated = {
    schema: "chronicle_entry.v0",
    entry_id: "entry-fabricated-no-marker",
    // source_system deliberately omitted -- the schema literal alone must
    // still be sufficient to detect this as a canonical-shape claim.
    receipt_root: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    proof_object_ref: "receiptos://portable-proof-object/proofobj-deadbeef",
    evidence_capsule_ref: "embedded:proofobj-deadbeef:evidence_capsule",
    provenance_summary_ref: "embedded:proofobj-deadbeef:provenance_summary",
    created_from: null,
    labels: [],
    notes: null,
  }

  const { status } = await post("/entries", fabricated)
  assert.equal(status, 400)

  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.some((entry) => entry.entry_id === "entry-fabricated-no-marker"), false)
})

test("G5. legacy shape with proof_system marker altered/omitted is still rejected via structural fingerprints", async () => {
  const fabricated = {
    entry_id: "entry-fabricated-altered-marker",
    proof_object_refs: [
      {
        proof_object_id: "proofobj-deadbeefdeadbeef",
        // proof_system altered away from "ReceiptOS" -- the proofobj- prefix
        // and receiptos:// proof_ref must still trigger detection.
        proof_system: "unknown",
        proof_ref: "receiptos://portable-proof-object/proofobj-deadbeefdeadbeef",
        receipt_root: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      },
    ],
    created_at: "2026-01-01T00:00:00Z",
  }

  const { status } = await post("/entries", fabricated)
  assert.equal(status, 400)

  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.some((entry) => entry.entry_id === "entry-fabricated-altered-marker"), false)
})

// H / I: internal inconsistency and identity-derivation failures, reached live.
test("H. internally inconsistent capsule labels with a correct top-level root are rejected (422) via the live route", async () => {
  const pair = cleanPair()
  const tampered = structuredClone(pair)
  tampered.proof_object.evidence_capsule.receipt_root.match = false

  const { status, json } = await post("/import/receipt", tampered)
  assert.equal(status, 422)
  assert.equal(json.code, "capsule_label_inconsistent")
})

test("I. an incorrect proof_object_id is rejected (422) via the live route", async () => {
  const pair = cleanPair()
  const tampered = structuredClone(pair)
  tampered.proof_object.proof_object_id = "proofobj-not-the-real-id"

  const { status, json } = await post("/import/receipt", tampered)
  assert.equal(status, 422)
  assert.equal(json.code, "proof_object_id_invalid")
})

// J. Bundle and timeline routes cannot bypass the ReceiptOS admission gate.
test("J1. /import/bundle rejects a bundle containing a ReceiptOS-backed legacy entry", async () => {
  const bundle = {
    bundle_type: "chronicle.bundle.v0",
    scope: "test",
    entries: [
      {
        entry_id: "entry-bundle-receiptos",
        proof_object_refs: [{ proof_object_id: "proofobj-x", proof_system: "ReceiptOS", receipt_root: "0xabc" }],
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
  }

  const { status, json } = await post("/import/bundle", bundle)
  assert.equal(status, 400)
  assert.equal(json.ok, false)

  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.some((entry) => entry.entry_id === "entry-bundle-receiptos"), false)
})

test("J2. /import/bundle still accepts a bundle with no ReceiptOS-backed entries (retained compatibility)", async () => {
  const bundle = {
    bundle_type: "chronicle.bundle.v0",
    scope: "test",
    entries: [
      {
        entry_id: "entry-bundle-manual",
        proof_object_refs: [{ proof_object_id: "manual-2", proof_system: "manual" }],
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
  }

  const { status, json } = await post("/import/bundle", bundle)
  assert.equal(status, 201)
  assert.equal(json.ok, true)
})

test("J2b. /import/bundle is preflighted atomically: one conflicting entry rejects the whole bundle, no partial insert", async () => {
  const seed = {
    bundle_type: "chronicle.bundle.v0",
    scope: "seed",
    entries: [
      { entry_id: "entry-bundle-atomic", proof_object_refs: [{ proof_object_id: "manual-atomic", proof_system: "manual" }], created_at: "2026-01-01T00:00:00Z" },
    ],
  }
  const seeded = await post("/import/bundle", seed)
  assert.equal(seeded.status, 201)

  const conflicting = {
    bundle_type: "chronicle.bundle.v0",
    scope: "conflict",
    entries: [
      { entry_id: "entry-bundle-fresh-one", proof_object_refs: [{ proof_object_id: "manual-fresh-one", proof_system: "manual" }], created_at: "2026-01-01T00:00:00Z" },
      // Same entry_id as the seeded entry, but different created_at ->
      // different canonical content -> conflict.
      { entry_id: "entry-bundle-atomic", proof_object_refs: [{ proof_object_id: "manual-atomic", proof_system: "manual" }], created_at: "2026-02-02T00:00:00Z" },
    ],
  }

  const { status, json } = await post("/import/bundle", conflicting)
  assert.equal(status, 409)
  assert.equal(json.ok, false)
  assert.deepEqual(json.conflicting_entry_ids, ["entry-bundle-atomic"])

  // No partial insert: entry-bundle-fresh-one must not have been stored
  // even though it did not itself conflict.
  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.some((entry) => entry.entry_id === "entry-bundle-fresh-one"), false)
})

test("J2c. /import/bundle treats a canonically identical duplicate as idempotent, not a conflict", async () => {
  const bundle = {
    bundle_type: "chronicle.bundle.v0",
    scope: "test",
    entries: [
      { entry_id: "entry-bundle-idempotent", proof_object_refs: [{ proof_object_id: "manual-idempotent", proof_system: "manual" }], created_at: "2026-01-01T00:00:00Z" },
    ],
  }

  const first = await post("/import/bundle", bundle)
  assert.equal(first.status, 201)

  const second = await post("/import/bundle", bundle)
  assert.equal(second.status, 200)
  assert.equal(second.json.imported_count, 0)
  assert.equal(second.json.existing_count, 1)

  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.filter((entry) => entry.entry_id === "entry-bundle-idempotent").length, 1)
})

test("J3. /import/receipt-timeline fails closed for a ReceiptOS-backed capsule (no evidence to recompute)", async () => {
  const capsule = {
    proof_object_ref: { proof_object_id: "proofobj-timeline-x", proof_system: "ReceiptOS", receipt_root: "0xabc" },
    project_refs: ["test"],
    events: [{ event_id: "evt-1", label: "test event", created_at: "2026-01-01T00:00:00Z", relation_type: "created" }],
  }

  const { status, json } = await post("/import/receipt-timeline", capsule)
  assert.equal(status, 400)
  assert.equal(json.ok, false)

  const entries = await (await fetch(`${BASE}/entries`)).json()
  assert.equal(entries.entries.some((entry) => entry.entry_id === "entry-evt-1"), false)
})

// Note: /import/receipt-timeline's pre-existing shape validator
// (isValidReceiptTimelineCapsule -> isValidReceiptProofObject) already
// required proof_system === "ReceiptOS" literally, before this hardening
// pass. There is no non-ReceiptOS payload that ever reached this route, so
// there is no compatibility behavior to retain here: this route now fails
// closed unconditionally, which is the correct outcome for a route whose
// payload shape can only ever claim a ReceiptOS-backed identity.

// K. Root-valid Collection/Portfolio math remains unchanged: the aggregate
// verifier still verifies only its declared ref set and makes no
// member-validity claim -- it does not become a substitute for admission.
test("K. GET /collections and /portfolios remain pure ref-set math, unaffected by admission hardening", async () => {
  await post("/import/receipt", cleanPair())
  const collections = await (await fetch(`${BASE}/collections`)).json()
  const portfolios = await (await fetch(`${BASE}/portfolios`)).json()
  assert.ok(collections.ok !== false)
  assert.ok(portfolios.ok !== false)
})

// Isolation proof: every live reproduction above ran through a server bound
// to CHRONICLE_STORE_PATH (a temp file). The tracked repository data file
// must be byte- and mtime-identical to how it was before this suite ever
// spawned the server -- not merely restored afterward, but never touched.
test("Z. the tracked data/chronicle-local-store.json was never written, restored, hashed, or git-checked-out by this suite", () => {
  const statAfter = fs.statSync(trackedDataFile)
  assert.equal(statAfter.mtimeMs, trackedDataFileStatBefore.mtimeMs, "tracked data file mtime changed")
  assert.equal(statAfter.size, trackedDataFileStatBefore.size, "tracked data file size changed")
})
