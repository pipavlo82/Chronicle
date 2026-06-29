import fs from "node:fs"
import path from "node:path"
import { createChronicleEntryV0 } from "../src/chronicle_entry.mjs"

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/create-chronicle-entry.mjs <portable-proof-object.json> <chronicle-entry.json>")
  process.exit(1)
}

const portableProofObject = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"))
const entry = createChronicleEntryV0(portableProofObject)
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true })
fs.writeFileSync(path.resolve(outputPath), JSON.stringify(entry, null, 2) + "\n")
console.log(path.resolve(outputPath))
