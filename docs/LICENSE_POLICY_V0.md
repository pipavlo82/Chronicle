# License Policy v0

## Purpose

This document defines the initial licensing and ownership boundaries for the Chronicle repository before any object schemas, renderers, NFT wrappers, or marketplace-related work are added.

The goal of v0 is to make the architecture and authorship boundaries explicit early, so future implementation work does not blur proof, ownership, brand, or renderer semantics.

## Repository License

Unless otherwise noted in a specific file or subcomponent, Chronicle repository source code and documentation are licensed under the Apache License 2.0.

This means the repository contents intended as code and docs are open under Apache-2.0, subject to the terms of the repository `LICENSE` file.

## Brand, Name, and Logo

The Apache-2.0 license for repository code and documentation does not automatically grant unrestricted commercial rights to the Chronicle brand.

In particular, the following are not automatically licensed for unrestricted commercial use merely because the repository is Apache-2.0:

- the Chronicle name
- Chronicle branding
- Chronicle logos
- brand-facing representations that imply official endorsement or affiliation

Trademark, brand, and naming rights remain reserved unless explicitly granted separately.

## Ownership of User-Created Chronicle Objects

User-created Chronicle objects belong to their creators or other lawful owners.

Chronicle as a repository, architecture, or software layer does not automatically claim ownership over:

- user receipts
- user histories
- user portfolios
- user-created Chronicle objects
- user-generated rendered outputs

Ownership of such objects remains with their creators or lawful owners, subject to any separate agreements, platform terms, employment terms, or applicable law.

## ReceiptOS Proof Object Boundary

ReceiptOS proof objects remain governed by their own source, project, and license context.

Chronicle may reference, group, render, and compose over ReceiptOS-derived proof objects, but Chronicle does not erase or supersede the licensing or provenance conditions that apply to those underlying proof artifacts.

This means:

- ReceiptOS remains the proof substrate
- ReceiptOS proof semantics remain upstream
- license or ownership questions attached to underlying proof objects remain tied to their own originating context

Chronicle does not claim ownership over underlying proof truth simply by referencing it.

## No Ownership Claim Over User Histories or Outputs

Chronicle does not claim ownership over user receipts, histories, portfolios, or rendered outputs merely because they are represented through Chronicle structures or renderer surfaces.

Chronicle provides an architectural and software layer. It does not, by default, convert user history into repository-owned property.

## Renderer Boundary

Renderers may project Chronicle objects into different surfaces, formats, or discovery environments, but they must not alter proof semantics.

A renderer may change presentation. It must not change the underlying meaning of proof.

This means renderers must not:

- redefine proof truth
- mutate receipt semantics
- present altered proof meaning as canonical
- claim authority over verification outcomes

Renderers are downstream surfaces, not proof authorities.

## NFT Wrappers

If NFT wrappers are added later, they should be treated only as transport, discovery, or ownership wrappers.

An NFT wrapper must not be described as:

- the proof substrate
- the source of verification truth
- ownership of proof truth itself
- authority to rewrite or control the underlying evidence semantics

Owning an NFT wrapper must not be described as owning or controlling the underlying proof truth.

At most, such a wrapper may represent an optional carrier, locator, visibility layer, or downstream ownership surface for a Chronicle object.

## Out of Scope for v0

The following are explicitly out of scope for License Policy v0:

- marketplace design
- tokenomics
- chain-specific commercialization
- NFT implementation details
- smart contract licensing design
- commercial licensing programs for Chronicle brand usage
- final legal treatment of future settlement or trading systems

This v0 policy is intentionally narrow. It establishes baseline repository licensing and ownership boundaries without pre-committing the project to a marketplace, token, or NFT-first architecture.

## Summary Principle

Chronicle repository code and docs are Apache-2.0.

Chronicle brand and trademark-like assets are not automatically open for unrestricted commercial use.

User-created Chronicle objects, receipts, histories, portfolios, and rendered outputs belong to their creators or lawful owners.

ReceiptOS proof objects remain governed by their own source, project, and license context.

Renderers may project Chronicle objects, but must not alter proof semantics.

Any future NFT wrapper is only an optional downstream carrier, not the source of proof truth.
