import fs from "node:fs"
import path from "node:path"
import { createChroniclePortfolioV0 } from "../src/chronicle_portable_history.mjs"

const args = process.argv.slice(2)
if (args.length < 3) {
  console.error("Usage: node scripts/create-chronicle-portfolio.mjs <output.json> <entry-a.json> <entry-b.json> [entry-c.json ...]")
  process.exit(1)
}

const [outputPath, ...entryPaths] = args
const entries = entryPaths.map((entryPath) => JSON.parse(fs.readFileSync(path.resolve(entryPath), "utf8")))
const portfolioId = path.basename(outputPath, path.extname(outputPath))
const portfolio = createChroniclePortfolioV0(entries, { portfolioId })
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true })
fs.writeFileSync(path.resolve(outputPath), JSON.stringify(portfolio, null, 2) + "\n")
console.log(path.resolve(outputPath))
