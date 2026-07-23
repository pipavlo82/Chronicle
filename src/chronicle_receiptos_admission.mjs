import { buildChronicleEntryV0FromAdmittedProofObject } from "./chronicle_entry.mjs"
import { computeReceiptRootV0, receiptRootsEqualV0 } from "./chronicle_receiptos_root.mjs"

// Central Chronicle-side admission boundary for ReceiptOS-backed history.
//
// This is the only sanctioned path from (HandoffEvidence, PortableProofObjectV0)
// to a stored chronicle_entry.v0. No caller-supplied chronicle_entry.v0 is ever
// accepted as proof that admission occurred: this function always starts from
// the original evidence and an independent recomputation, never from a claim.
//
// It intentionally never reads evidence_capsule.receipt_root.status/.match or
// verifier_result.ok/.status as a *source of truth* -- they are checked only
// for internal consistency *after* the independent recomputation has already
// established the verified root.

export class ReceiptOSAdmissionError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "ReceiptOSAdmissionError"
    this.code = code
  }
}

const CODE = {
  EVIDENCE_ROOT_MISSING: "evidence_root_missing",
  EVIDENCE_ROOT_MISMATCH: "evidence_root_mismatch",
  PROOF_ROOT_MISMATCH: "proof_root_mismatch",
  CAPSULE_STORED_MISMATCH: "capsule_stored_mismatch",
  CAPSULE_COMPUTED_MISMATCH: "capsule_computed_mismatch",
  CAPSULE_LABEL_INCONSISTENT: "capsule_label_inconsistent",
  VERIFIER_RESULT_INCONSISTENT: "verifier_result_inconsistent",
  PROOF_OBJECT_ID_INVALID: "proof_object_id_invalid",
  PROOF_REF_INVALID: "proof_ref_invalid",
  INPUT_MALFORMED: "input_malformed",
}

export const RECEIPTOS_ADMISSION_ERROR_CODES = CODE

function deriveProofObjectIdV0(receiptRoot) {
  return `proofobj-${receiptRoot.replace(/^0x/, "")}`
}

function deriveProofRefV0(proofObjectId) {
  return `receiptos://portable-proof-object/${proofObjectId}`
}

export const deriveReceiptOSProofObjectId = deriveProofObjectIdV0
export const deriveReceiptOSProofRef = deriveProofRefV0

/**
 * Independently verify (evidence, proofObject) and, only on success, return
 * the canonical chronicle_entry.v0. Throws ReceiptOSAdmissionError on any
 * failure; never returns a partially-admitted result.
 */
export function admitReceiptOSChronicleEntryV0(evidence, proofObject, options = {}) {
  if (!evidence || typeof evidence !== "object") {
    throw new ReceiptOSAdmissionError(CODE.INPUT_MALFORMED, "admitReceiptOSChronicleEntryV0 requires the original HandoffEvidence object")
  }
  if (!proofObject || typeof proofObject !== "object") {
    throw new ReceiptOSAdmissionError(CODE.INPUT_MALFORMED, "admitReceiptOSChronicleEntryV0 requires a PortableProofObjectV0 object")
  }
  if (proofObject.schema !== "receiptos.portable_proof_object.v0") {
    throw new ReceiptOSAdmissionError(CODE.INPUT_MALFORMED, "admitReceiptOSChronicleEntryV0 expects receiptos.portable_proof_object.v0")
  }
  if (!proofObject.evidence_capsule || typeof proofObject.evidence_capsule !== "object") {
    throw new ReceiptOSAdmissionError(CODE.INPUT_MALFORMED, "admitReceiptOSChronicleEntryV0 requires proofObject.evidence_capsule")
  }

  // 1. Independent recomputation is the source of truth -- not any status/ok field.
  const storedRoot = evidence?.anchor?.receipt_root ?? null
  if (!storedRoot) {
    throw new ReceiptOSAdmissionError(CODE.EVIDENCE_ROOT_MISSING, "admitReceiptOSChronicleEntryV0 requires evidence.anchor.receipt_root to be present")
  }

  const recomputedRoot = computeReceiptRootV0(evidence)
  if (!receiptRootsEqualV0(storedRoot, recomputedRoot)) {
    throw new ReceiptOSAdmissionError(CODE.EVIDENCE_ROOT_MISMATCH, "admitReceiptOSChronicleEntryV0 requires the stored receipt_root to independently recompute (mismatch)")
  }

  const verifiedRoot = storedRoot

  if (!receiptRootsEqualV0(proofObject.receipt_root, verifiedRoot)) {
    throw new ReceiptOSAdmissionError(CODE.PROOF_ROOT_MISMATCH, "admitReceiptOSChronicleEntryV0 requires proofObject.receipt_root to equal the verified stored/recomputed receipt_root")
  }

  // 2. Cross-object consistency: the embedded capsule must agree with the
  // root just independently verified -- these fields are checked, never trusted.
  const capsuleReceiptRoot = proofObject.evidence_capsule.receipt_root ?? {}
  if (!receiptRootsEqualV0(capsuleReceiptRoot.stored, verifiedRoot)) {
    throw new ReceiptOSAdmissionError(CODE.CAPSULE_STORED_MISMATCH, "admitReceiptOSChronicleEntryV0 requires evidence_capsule.receipt_root.stored to equal the verified receipt_root")
  }
  if (!receiptRootsEqualV0(capsuleReceiptRoot.computed, recomputedRoot)) {
    throw new ReceiptOSAdmissionError(CODE.CAPSULE_COMPUTED_MISMATCH, "admitReceiptOSChronicleEntryV0 requires evidence_capsule.receipt_root.computed to equal the independently recomputed receipt_root")
  }
  if (capsuleReceiptRoot.match !== true || capsuleReceiptRoot.status !== "verified") {
    throw new ReceiptOSAdmissionError(CODE.CAPSULE_LABEL_INCONSISTENT, "admitReceiptOSChronicleEntryV0 requires evidence_capsule.receipt_root.match/status to be internally consistent with the verified root")
  }

  const verifierResult = proofObject.evidence_capsule.verifier_result ?? {}
  if (verifierResult.ok !== true || verifierResult.status !== "verified") {
    throw new ReceiptOSAdmissionError(CODE.VERIFIER_RESULT_INCONSISTENT, "admitReceiptOSChronicleEntryV0 requires evidence_capsule.verifier_result to be internally consistent with a successful independent recomputation")
  }

  // 3. Identity binding: proof_object_id/proof_ref are normatively derived
  // from the verified root. Reuse the one canonical derivation, never a second.
  const expectedProofObjectId = deriveProofObjectIdV0(verifiedRoot)
  if (proofObject.proof_object_id !== expectedProofObjectId) {
    throw new ReceiptOSAdmissionError(CODE.PROOF_OBJECT_ID_INVALID, "admitReceiptOSChronicleEntryV0 requires proofObject.proof_object_id to be the canonical derivation of the verified receipt_root")
  }
  if (proofObject.proof_ref !== deriveProofRefV0(expectedProofObjectId)) {
    throw new ReceiptOSAdmissionError(CODE.PROOF_REF_INVALID, "admitReceiptOSChronicleEntryV0 requires proofObject.proof_ref to be the canonical derivation of proof_object_id")
  }

  // Only now, after independent verification, build the canonical entry --
  // reusing the existing internal field-mapping builder rather than a second one.
  return buildChronicleEntryV0FromAdmittedProofObject(proofObject, options)
}
