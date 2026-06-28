import crypto from "node:crypto"
import { stableCanonicalJson } from "./chronicle_position_artifact.mjs"

export const PORTFOLIO_VERSION_V0 = "chronicle.portfolio.v0"

export function normalizePortfolioIdentityInput(input) {
  const portfolioVersion = typeof input?.portfolio_version === "string" && input.portfolio_version.trim()
    ? input.portfolio_version.trim()
    : PORTFOLIO_VERSION_V0
  const portfolioId = typeof input?.portfolio_id === "string" ? input.portfolio_id : ""
  const collectionRefs = Array.isArray(input?.collection_refs)
    ? input.collection_refs.filter((value) => typeof value === "string").slice().sort((a, b) => a.localeCompare(b))
    : []

  return {
    portfolio_version: portfolioVersion,
    portfolio_id: portfolioId,
    collection_refs: collectionRefs,
  }
}

export function computePortfolioRootV0(canonicalPortfolioIdentityInput) {
  const normalized = normalizePortfolioIdentityInput(canonicalPortfolioIdentityInput)
  const canonicalJson = stableCanonicalJson(normalized)
  const digest = crypto.createHash("sha256").update(canonicalJson).digest("hex")
  return `sha256:${digest}`
}
