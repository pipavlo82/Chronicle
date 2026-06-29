import fs from "node:fs"
import path from "node:path"
import { verifyChroniclePortfolioV0 } from "../src/chronicle_portable_history.mjs"

const [inputPath] = process.argv.slice(2)
if (!inputPath) {
  console.error("Usage: node scripts/verify-chronicle-portfolio.mjs <chronicle-portfolio.json>")
  process.exit(1)
}

const portfolio = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"))
const result = verifyChroniclePortfolioV0(portfolio)
console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
