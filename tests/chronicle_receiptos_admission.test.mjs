import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { admitReceiptOSChronicleEntryV0, ReceiptOSAdmissionError, RECEIPTOS_ADMISSION_ERROR_CODES } from "../src/chronicle_receiptos_admission.mjs"
import { classifyEntryAdmission, IDENTITY_RESULT } from "../src/chronicle_entry_identity.mjs"
import * as chronicleEntryModule from "../src/chronicle_entry.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/receiptos", name), "utf8"))
}

function cleanPair() {
  return {
    evidence: readFixture("session-evidence.sample.json"),
    proof: readFixture("portable-proof-object.sample.json"),
  }
}

function tamperedPair() {
  return {
    evidence: readFixture("session-evidence.tampered.sample.json"),
    proof: readFixture("portable-proof-object.tampered.sample.json"),
  }
}

function assertAdmissionError(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof ReceiptOSAdmissionError, "expected a ReceiptOSAdmissionError")
    assert.equal(error.code, code)
    return true
  })
}

// A. Clean evidence + matching proof object: admitted once.
test("A. clean evidence + proof object is admitted as a canonical chronicle_entry.v0", () => {
  const { evidence, proof } = cleanPair()
  const entry = admitReceiptOSChronicleEntryV0(evidence, proof)

  assert.equal(entry.schema, "chronicle_entry.v0")
  assert.equal(entry.receipt_root, proof.receipt_root)
  assert.equal(entry.proof_object_ref, proof.proof_ref)
  assert.equal(entry.source_system, "ReceiptOS")
})

// E. Tampered evidence: proof object may contain mismatch evidence, but admission fails.
test("E. tampered evidence: proof object still carries mismatch evidence, but admission fails", () => {
  const { evidence, proof } = tamperedPair()

  assert.equal(proof.evidence_capsule.receipt_root.status, "mismatch")
  assert.equal(proof.evidence_capsule.receipt_root.match, false)
  assert.equal(proof.evidence_capsule.verifier_result.ok, false)

  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidence, proof), RECEIPTOS_ADMISSION_ERROR_CODES.EVIDENCE_ROOT_MISMATCH)
})

// F. Missing original evidence: proof-object-only usage fails as unverifiable.
test("F. missing evidence.anchor.receipt_root fails as unverifiable, distinct from mismatch", () => {
  const { evidence, proof } = cleanPair()
  const evidenceWithoutRoot = structuredClone(evidence)
  delete evidenceWithoutRoot.anchor.receipt_root

  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidenceWithoutRoot, proof), RECEIPTOS_ADMISSION_ERROR_CODES.EVIDENCE_ROOT_MISSING)
})

// H. Internally inconsistent capsule labels with correct top-level root: rejected after independent recomputation.
test("H. correct root values with contradictory capsule match/status fail as internal inconsistency, not evidence mismatch", () => {
  const { evidence, proof } = cleanPair()
  const tamperedProof = structuredClone(proof)
  tamperedProof.evidence_capsule.receipt_root.match = false

  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidence, tamperedProof), RECEIPTOS_ADMISSION_ERROR_CODES.CAPSULE_LABEL_INCONSISTENT)
})

test("H2. correct root values with a contradictory verifier_result fail as internal inconsistency", () => {
  const { evidence, proof } = cleanPair()
  const tamperedProof = structuredClone(proof)
  tamperedProof.evidence_capsule.verifier_result.ok = false

  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidence, tamperedProof), RECEIPTOS_ADMISSION_ERROR_CODES.VERIFIER_RESULT_INCONSISTENT)
})

test("H3. embedded capsule stored/computed roots mutated independently are each rejected", () => {
  const { evidence, proof } = cleanPair()

  const badStored = structuredClone(proof)
  badStored.evidence_capsule.receipt_root.stored = `0x${"e".repeat(64)}`
  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidence, badStored), RECEIPTOS_ADMISSION_ERROR_CODES.CAPSULE_STORED_MISMATCH)

  const badComputed = structuredClone(proof)
  badComputed.evidence_capsule.receipt_root.computed = `0x${"d".repeat(64)}`
  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidence, badComputed), RECEIPTOS_ADMISSION_ERROR_CODES.CAPSULE_COMPUTED_MISMATCH)
})

// I. Incorrect proof_object_id or proof_ref: rejected.
test("I. proof_object_id inconsistent with the verified root is rejected", () => {
  const { evidence, proof } = cleanPair()
  const tamperedProof = { ...proof, proof_object_id: "proofobj-not-the-real-id" }

  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidence, tamperedProof), RECEIPTOS_ADMISSION_ERROR_CODES.PROOF_OBJECT_ID_INVALID)
})

test("I2. proof_ref inconsistent with proof_object_id is rejected", () => {
  const { evidence, proof } = cleanPair()
  const tamperedProof = { ...proof, proof_ref: "receiptos://portable-proof-object/not-the-real-ref" }

  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidence, tamperedProof), RECEIPTOS_ADMISSION_ERROR_CODES.PROOF_REF_INVALID)
})

test("cross-object inconsistency: top-level proofObject.receipt_root altered while evidence stays valid is rejected", () => {
  const { evidence, proof } = cleanPair()
  const alteredProof = { ...proof, receipt_root: `0x${"f".repeat(64)}` }

  assertAdmissionError(() => admitReceiptOSChronicleEntryV0(evidence, alteredProof), RECEIPTOS_ADMISSION_ERROR_CODES.PROOF_ROOT_MISMATCH)
})

// B. Same canonical payload imported twice: second import is idempotent (identity centralization).
test("B. classifyEntryAdmission: identical canonical content under the same identity is idempotent", () => {
  const { evidence, proof } = cleanPair()
  const entry = admitReceiptOSChronicleEntryV0(evidence, proof)
  const store = [entry]

  const secondEntry = admitReceiptOSChronicleEntryV0(evidence, proof)
  const classification = classifyEntryAdmission(store, secondEntry)

  assert.equal(classification.result, IDENTITY_RESULT.IDEMPOTENT)
  assert.equal(classification.existing, entry)
})

// C / D. Same identity, different canonical content: conflict, never silently discarded, never coexists.
test("C/D. classifyEntryAdmission: same entry_id with different content is a conflict, not silent-discard or overwrite", () => {
  const { evidence, proof } = cleanPair()
  const entry = admitReceiptOSChronicleEntryV0(evidence, proof)
  const store = [entry]

  const differentEntry = { ...entry, notes: "a materially different claim under the same identity" }
  const classification = classifyEntryAdmission(store, differentEntry)

  assert.equal(classification.result, IDENTITY_RESULT.CONFLICT)
  assert.equal(classification.existing, entry)
  // The store itself must never be mutated by classification alone.
  assert.equal(store.length, 1)
  assert.deepEqual(store[0], entry)
})

test("classifyEntryAdmission: same proof_object_ref under a different entry_id is still identity-matched", () => {
  const { evidence, proof } = cleanPair()
  const entry = admitReceiptOSChronicleEntryV0(evidence, proof, { entryId: "entry-custom-alias" })
  const store = [entry]

  const sameProofDifferentEntryId = admitReceiptOSChronicleEntryV0(evidence, proof, { entryId: "entry-another-alias" })
  const classification = classifyEntryAdmission(store, sameProofDifferentEntryId)

  assert.equal(classification.result, IDENTITY_RESULT.CONFLICT)
})

// Module-API bypass regression: importing Chronicle modules directly must
// not offer any exported function that mints a canonical ReceiptOS
// chronicle_entry.v0 from a proof object alone.
test("module API: no export named/presented as canonical Chronicle Entry creation accepts a proof object alone", () => {
  assert.equal(
    "createChronicleEntryV0" in chronicleEntryModule,
    false,
    "chronicle_entry.mjs must not export a public-looking createChronicleEntryV0",
  )
  assert.equal(typeof chronicleEntryModule.buildChronicleEntryV0FromAdmittedProofObject, "function")

  // The only public creation API is admitReceiptOSChronicleEntryV0, and it
  // requires both evidence and a proof object -- a proof object alone,
  // however well-formed, is rejected before any entry is built.
  const { proof } = cleanPair()
  assert.throws(
    () => admitReceiptOSChronicleEntryV0(undefined, proof),
    (error) => error instanceof ReceiptOSAdmissionError && error.code === RECEIPTOS_ADMISSION_ERROR_CODES.INPUT_MALFORMED,
  )
  assert.throws(
    () => admitReceiptOSChronicleEntryV0(null, proof),
    (error) => error instanceof ReceiptOSAdmissionError && error.code === RECEIPTOS_ADMISSION_ERROR_CODES.INPUT_MALFORMED,
  )
  // Even a mismatched (but present) evidence object cannot mint an entry
  // from this proof object -- see test E for the tampered-fixture case.
})
