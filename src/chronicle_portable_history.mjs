import crypto from "node:crypto"
import { stableCanonicalJson } from "./chronicle_position_artifact.mjs"

export const CHRONICLE_PORTFOLIO_VERSION_V0 = "chronicle_portfolio.v0"

export function normalizeChroniclePortfolioIdentityInput(input) {
  const portfolioVersion = typeof input?.portfolio_version === "string" && input.portfolio_version.trim()
    ? input.portfolio_version.trim()
    : CHRONICLE_PORTFOLIO_VERSION_V0
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

export function computeChroniclePortfolioRootV0(canonicalPortfolioIdentityInput) {
  const normalized = normalizeChroniclePortfolioIdentityInput(canonicalPortfolioIdentityInput)
  const canonicalJson = stableCanonicalJson(normalized)
  const digest = crypto.createHash("sha256").update(canonicalJson).digest("hex")
  return `sha256:${digest}`
}

export function createChroniclePortfolioV0(entries, options = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("createChroniclePortfolioV0 requires one or more chronicle entries")
  }

  const collectionRefs = entries.map((entry) => {
    if (!entry || entry.schema !== "chronicle_entry.v0") {
      throw new Error("Chronicle portfolio v0 currently expects chronicle_entry.v0 inputs")
    }
    if (typeof entry.entry_id !== "string" || !entry.entry_id) {
      throw new Error("Chronicle entry is missing entry_id")
    }
    return entry.entry_id
  })

  const identityInput = normalizeChroniclePortfolioIdentityInput({
    portfolio_version: options.portfolioVersion ?? CHRONICLE_PORTFOLIO_VERSION_V0,
    portfolio_id: options.portfolioId ?? "chronicle-portfolio-v0",
    collection_refs: collectionRefs,
  })

  return {
    schema: CHRONICLE_PORTFOLIO_VERSION_V0,
    portfolio_id: identityInput.portfolio_id,
    portfolio_version: identityInput.portfolio_version,
    collection_refs: identityInput.collection_refs,
    portfolio_root: computeChroniclePortfolioRootV0(identityInput),
  }
}

export function verifyChroniclePortfolioV0(portfolio) {
  if (!portfolio || portfolio.schema !== CHRONICLE_PORTFOLIO_VERSION_V0) {
    throw new Error("verifyChroniclePortfolioV0 expects chronicle_portfolio.v0")
  }
  const recomputed = computeChroniclePortfolioRootV0({
    portfolio_version: portfolio.portfolio_version,
    portfolio_id: portfolio.portfolio_id,
    collection_refs: portfolio.collection_refs,
  })

  return {
    ok: recomputed === portfolio.portfolio_root,
    portfolio_root: portfolio.portfolio_root,
    recomputed_portfolio_root: recomputed,
  }
}
