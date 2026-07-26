import test from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  admitReceiptOSChronicleEntryV0,
  ReceiptOSAdmissionError,
} from "../src/chronicle_receiptos_admission.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(here, "fixtures", "receiptos-chronicle-admission-v0")
const vectorsRoot = join(packageRoot, "vectors")
const manifest = JSON.parse(readFileSync(join(packageRoot, "manifest.json"), "utf8"))
const schema = JSON.parse(readFileSync(join(packageRoot, manifest.vector_schema.path), "utf8"))
const vectorFiles = readdirSync(vectorsRoot).filter((name) => name.endsWith(".json")).sort()
const vectors = vectorFiles.map((name) => JSON.parse(readFileSync(join(vectorsRoot, name), "utf8")))
const sha256 = (value) => createHash("sha256").update(value).digest("hex")

const codeMap = {
  evidence_root_missing: "unverifiable",
  evidence_root_mismatch: "evidence_mismatch",
  proof_root_mismatch: "cross_object_inconsistency",
  capsule_stored_mismatch: "cross_object_inconsistency",
  capsule_computed_mismatch: "cross_object_inconsistency",
  capsule_label_inconsistent: "reported_state_inconsistency",
  verifier_result_inconsistent: "reported_state_inconsistency",
  proof_object_id_invalid: "identity_inconsistency",
  proof_ref_invalid: "identity_inconsistency",
  input_malformed: "malformed_input",
}

function execute(vector) {
  try {
    const chronicleEntry = admitReceiptOSChronicleEntryV0(
      vector.input.evidence,
      vector.input.proof_object,
      vector.input.options,
    )
    return {
      outcome: "admitted",
      failure_class: "none",
      reason_code: null,
      chronicle_entry: chronicleEntry,
    }
  } catch (error) {
    assert.ok(error instanceof ReceiptOSAdmissionError, `Unexpected Chronicle error: ${error}`)
    const failureClass = codeMap[error.code]
    assert.ok(failureClass, `Unmapped Chronicle admission code: ${error.code}`)
    return {
      outcome: "rejected",
      failure_class: failureClass,
      reason_code: error.code === "input_malformed" ? null : error.code,
      chronicle_entry: null,
    }
  }
}

test("shared package schema, inventory, and manifest are complete and hash-pinned", () => {
  assert.equal(manifest.schema, "receiptos_chronicle_admission_fixture_manifest.v0")
  assert.equal(manifest.package_version, "receiptos-chronicle-admission-v0")
  assert.equal(vectorFiles.length, 11)
  assert.equal(new Set(vectors.map(({ case_id }) => case_id)).size, 11)

  const required = [
    "clean_admitted",
    "evidence_root_missing",
    "evidence_root_mismatch",
    "proof_root_mismatch",
    "capsule_stored_root_mismatch",
    "capsule_computed_root_mismatch",
    "capsule_label_inconsistent",
    "verifier_result_inconsistent",
    "proof_object_id_invalid",
    "proof_ref_invalid",
    "proof_object_only_rejected",
  ].sort()
  assert.deepEqual(vectors.map(({ case_id }) => case_id).sort(), required)

  const failureClasses = schema.properties.expected.properties.failure_class.enum
  for (const vector of vectors) {
    assert.equal(vector.schema, "receiptos_chronicle_admission_vector.v0")
    assert.ok(vector.case_id.length > 0)
    assert.ok(vector.description.length > 0)
    assert.ok(["admitted", "rejected"].includes(vector.expected.outcome))
    assert.ok(failureClasses.includes(vector.expected.failure_class))
    assert.equal(vector.expected.outcome === "admitted", vector.expected.chronicle_entry !== null)
  }

  assert.deepEqual(
    manifest.files.map(({ path }) => path),
    manifest.files.map(({ path }) => path).sort(),
  )
  const aggregate = manifest.files.map(({ path, sha256: expectedHash }) => {
    assert.equal(sha256(readFileSync(join(packageRoot, path))), expectedHash, path)
    return `${path}\t${expectedHash}\n`
  }).join("")
  assert.equal(sha256(aggregate), manifest.fixture_set_sha256)
  assert.equal(
    manifest.vector_schema.sha256,
    manifest.files.find(({ path }) => path === manifest.vector_schema.path)?.sha256,
  )
})

for (const vector of vectors) {
  test(`shared admission vector: ${vector.case_id}`, () => {
    const actual = execute(vector)
    assert.deepEqual(actual, vector.expected)
    if (vector.expected.outcome === "rejected") {
      assert.equal(actual.chronicle_entry, null)
    }
  })
}
