export const CHRONICLE_ENTRY_VERSION_V0 = "chronicle_entry.v0"

// Internal field-mapping builder only. This is NOT the canonical
// ReceiptOS entry-creation API and MUST NOT be called with a
// caller-supplied proof object that has not already passed independent
// admission. It performs no recomputation and no evidence check of its
// own -- it only maps an already-admitted PortableProofObjectV0 onto the
// canonical chronicle_entry.v0 wire shape.
//
// The only sanctioned public path to a canonical ReceiptOS-backed
// chronicle_entry.v0 is admitReceiptOSChronicleEntryV0(evidence, proofObject)
// in src/chronicle_receiptos_admission.mjs, which calls this builder only
// after the independent recomputation gate has passed.
export function buildChronicleEntryV0FromAdmittedProofObject(portableProofObject, options = {}) {
  if (!portableProofObject || typeof portableProofObject !== "object") {
    throw new Error("buildChronicleEntryV0FromAdmittedProofObject requires a portable proof object")
  }
  if (portableProofObject.schema !== "receiptos.portable_proof_object.v0") {
    throw new Error("Chronicle entry v0 currently expects receiptos.portable_proof_object.v0")
  }
  if (typeof portableProofObject.proof_object_id !== "string" || !portableProofObject.proof_object_id) {
    throw new Error("Portable proof object is missing proof_object_id")
  }
  if (typeof portableProofObject.receipt_root !== "string" || !portableProofObject.receipt_root) {
    throw new Error("Portable proof object is missing receipt_root")
  }

  return {
    schema: CHRONICLE_ENTRY_VERSION_V0,
    entry_id: options.entryId ?? `entry-${portableProofObject.proof_object_id}`,
    source_system: portableProofObject.proof_system,
    receipt_root: portableProofObject.receipt_root,
    proof_object_ref: portableProofObject.proof_ref,
    evidence_capsule_ref: options.evidenceCapsuleRef ?? `embedded:${portableProofObject.proof_object_id}:evidence_capsule`,
    provenance_summary_ref: options.provenanceSummaryRef ?? `embedded:${portableProofObject.proof_object_id}:provenance_summary`,
    created_from: options.createdFrom ?? portableProofObject.source_evidence_ref,
    labels: Array.isArray(options.labels) ? options.labels.filter((value) => typeof value === "string") : [],
    notes: typeof options.notes === "string" ? options.notes : null,
  }
}
