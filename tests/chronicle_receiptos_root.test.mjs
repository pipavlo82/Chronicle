import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { computeReceiptRootV0, receiptRootsEqualV0 } from "../src/chronicle_receiptos_root.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/receiptos", name), "utf8"))
}

test("computeReceiptRootV0 matches crystal-receipt's computeReceiptRoot on the clean fixture (cross-runtime parity)", () => {
  const evidence = readFixture("session-evidence.sample.json")
  const recomputed = computeReceiptRootV0(evidence)
  // Recorded from crystal-receipt's own computeReceiptRoot() run against the
  // identical fixture bytes: the clean fixture's stored and computed roots match.
  assert.equal(recomputed, "0x687dc5c00d9241469138bb1c17a06af1b8713b0f84663b55e11d476f4171a6bc")
  assert.equal(recomputed, evidence.anchor.receipt_root)
})

test("computeReceiptRootV0 matches crystal-receipt's computeReceiptRoot on the tampered fixture (cross-runtime parity)", () => {
  const evidence = readFixture("session-evidence.tampered.sample.json")
  const recomputed = computeReceiptRootV0(evidence)
  // Recorded from crystal-receipt's own computeReceiptRoot() run against the
  // identical fixture bytes: the tampered fixture's stored root does not
  // recompute -- only task.title changed, which is not stripped like anchor.
  assert.equal(recomputed, "0x1c0b2bbced04dabf8ae4bad9649c76a1531ad569bc4df8e74704f63cd79ba570")
  assert.notEqual(recomputed, evidence.anchor.receipt_root)
})

test("computeReceiptRootV0 ignores the anchor field", () => {
  const evidence = readFixture("session-evidence.sample.json")
  const withDifferentAnchor = { ...evidence, anchor: { ...evidence.anchor, tx_hash: "0xsomethingdifferent" } }
  assert.equal(computeReceiptRootV0(evidence), computeReceiptRootV0(withDifferentAnchor))
})

test("computeReceiptRootV0 is sensitive to any non-anchor field", () => {
  const evidence = readFixture("session-evidence.sample.json")
  const mutated = { ...evidence, session_id: `${evidence.session_id}-mutated` }
  assert.notEqual(computeReceiptRootV0(evidence), computeReceiptRootV0(mutated))
})

test("receiptRootsEqualV0 compares case-insensitively like crystal-receipt's verifyHandoffReceiptRoot", () => {
  assert.equal(receiptRootsEqualV0("0xABCDEF", "0xabcdef"), true)
  assert.equal(receiptRootsEqualV0("0xabc", "0xdef"), false)
  assert.equal(receiptRootsEqualV0(null, "0xabc"), false)
})
