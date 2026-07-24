import fs from "node:fs"
import path from "node:path"
import { admitReceiptOSChronicleEntryV0, ReceiptOSAdmissionError } from "../src/chronicle_receiptos_admission.mjs"

const [evidencePath, proofObjectPath, outputPath] = process.argv.slice(2)

if (!evidencePath || !proofObjectPath || !outputPath) {
  console.error("Usage: node scripts/create-chronicle-entry.mjs <handoff-evidence.json> <portable-proof-object.json> <chronicle-entry.json>")
  console.error("Both the original evidence and the portable proof object are required: a proof object alone cannot be independently recomputed.")
  process.exit(1)
}

const evidence = JSON.parse(fs.readFileSync(path.resolve(evidencePath), "utf8"))
const portableProofObject = JSON.parse(fs.readFileSync(path.resolve(proofObjectPath), "utf8"))

let entry
try {
  entry = admitReceiptOSChronicleEntryV0(evidence, portableProofObject)
} catch (error) {
  if (error instanceof ReceiptOSAdmissionError) {
    console.error(`Admission failed [${error.code}]: ${error.message}`)
    process.exit(1)
  }
  throw error
}

fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true })
fs.writeFileSync(path.resolve(outputPath), JSON.stringify(entry, null, 2) + "\n")
console.log(path.resolve(outputPath))
