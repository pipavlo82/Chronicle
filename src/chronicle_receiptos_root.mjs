import crypto from "node:crypto"

// Independent, Chronicle-local recomputation of the ReceiptOS
// HandoffEvidence receipt_root rule.
//
// This is a deliberate, literal port -- not a reinvention -- of the pinned
// algorithm in crystal-receipt:
//   src/receiptos/canon/canonicalize.ts  (canonicalizeReceiptOSV0 below)
//   src/receiptos/canon/receipt-root.ts  (stripAnchorV0 / computeReceiptRootV0 below)
//
// Parity rests on three facts, not on trusting crystal-receipt's process:
//   1. the three functions below are line-for-line ports with no logic changes;
//   2. JSON.stringify / Object.keys / Array#sort are standard ECMAScript
//      behavior, identical across the Bun and Node runtimes both repos use;
//   3. SHA-256 is a deterministic cryptographic primitive with no
//      cross-implementation variance for correct implementations
//      (node:crypto here, node:crypto there).
// Chronicle does not import crystal-receipt at runtime; this module has no
// dependency outside node:crypto.

export function canonicalizeReceiptOSV0(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeReceiptOSV0).join(",")}]`
  }

  const entries = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeReceiptOSV0(value[key])}`)

  return `{${entries.join(",")}}`
}

export function stripAnchorV0(value) {
  const clone = { ...value }
  delete clone.anchor
  return clone
}

export function sha256HexV0(input) {
  return crypto.createHash("sha256").update(input).digest("hex")
}

// computeReceiptRootV0() always ignores the top-level anchor field, matching
// crystal-receipt's computeReceiptRoot() exactly: this prevents receipt_root
// from depending on its own anchored value.
export function computeReceiptRootV0(evidence) {
  return `0x${sha256HexV0(canonicalizeReceiptOSV0(stripAnchorV0(evidence)))}`
}

// Root comparison convention matches crystal-receipt's verifyHandoffReceiptRoot:
// lowercase-normalized string equality, never a trusted boolean/status field.
export function receiptRootsEqualV0(a, b) {
  return typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase()
}
