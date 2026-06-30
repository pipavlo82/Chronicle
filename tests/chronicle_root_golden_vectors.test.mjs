import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { computeArtifactRootV0 } from "../src/chronicle_position_artifact.mjs"
import { computeCollectionRootV0 } from "../src/chronicle_collection.mjs"
import { computePortfolioRootV0 } from "../src/chronicle_portfolio.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturePath = path.join(__dirname, "fixtures", "chronicle-root-golden-vectors.json")
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"))

for (const vector of fixture.artifact) {
  test(`artifact golden vector: ${vector.name}`, () => {
    assert.equal(computeArtifactRootV0(vector.input), vector.expected_root)
  })
}

for (const vector of fixture.collection) {
  test(`collection golden vector: ${vector.name}`, () => {
    assert.equal(computeCollectionRootV0(vector.input), vector.expected_root)
  })
}

for (const vector of fixture.portfolio) {
  test(`portfolio golden vector: ${vector.name}`, () => {
    assert.equal(computePortfolioRootV0(vector.input), vector.expected_root)
  })
}
