# Chronicle Asset Model v0

## 1. Asset hierarchy

The Chronicle asset hierarchy can be understood as:

ReceiptOS Proof  
→ Chronicle Entry  
→ Chronicle Timeline  
→ Chronicle Position  
→ Chronicle Bundle

Each layer plays a different role.

- **ReceiptOS Proof** provides canonical proof-bearing truth
- **Chronicle Entry** provides the smallest Chronicle-native continuity unit
- **Chronicle Timeline** provides ordered historical continuity
- **Chronicle Position** provides the accumulated, scoped historical object
- **Chronicle Bundle** provides the transport format for moving that historical object between systems

This hierarchy matters because it distinguishes proof, continuity, accumulated historical state, and portability.

## 2. What is NOT the asset

The Chronicle asset is **not**:

- a single receipt
- a single proof
- a timeline event
- a viewer page

A single ReceiptOS proof may be extremely important, but it is still only one proof-bearing event.
A single Chronicle timeline event may be useful for viewing history, but it is still only one projected moment in that history.
A viewer page may display Chronicle state, but it is not the asset itself.

The asset must be larger than one proof and more durable than one rendering.

## 3. What IS the asset

The Chronicle asset is:

**Chronicle Position**

Definition:

**"A portable accumulation of verified history."**

This definition captures the core Chronicle thesis:

- the asset is not proof alone
- the asset is not presentation alone
- the asset is not identity alone
- the asset is accumulated verified continuity over time

Chronicle Position is therefore the first Chronicle-native object that behaves like an asset without collapsing into token-first thinking.

## 4. Why Position is the asset

A Chronicle Position is the asset because it:

- accumulates history
- survives export/import
- contains multiple proofs
- contains continuity
- grows over time
- can move between systems

That makes it different from a single receipt or a single proof reference.

A Position can represent:

- one evolving project history
- one accumulated release history
- one contributor or agent work history slice
- one scoped portable body of verified work

It is therefore the most natural answer to the question:

**What is the thing in Chronicle that holds value as an object?**

The answer is not one proof and not one page.
It is the accumulated historical position.

## 5. Uniswap V3 analogy

A useful analogy is Uniswap V3.

In Uniswap V3:

- the LP NFT is not the liquidity
- the LP NFT represents a liquidity position

The position is the important concept.
It is scoped, portable, and accumulates state.

Chronicle should be understood similarly:

- the Chronicle Bundle is not the history itself
- the Chronicle Position represents accumulated verified history

The analogy is useful because it separates:

- the system
- the stateful position inside the system
- the transport or wrapper used to carry that position

Chronicle should borrow the position intuition, not the token-first ontology.

## 6. Chronicle Bundle

Chronicle Bundle is the transport format.

Chronicle Position is the asset.

This distinction is important.

A Bundle can:

- export Chronicle data
- import Chronicle data
- move Chronicle state between nodes
- preserve proof refs across systems
- support idempotent re-ingestion

But the Bundle is still the carrier.
It is not the conceptual asset in itself.

The Bundle carries the Position.
The Position is the thing being carried.

## 7. Future research

Important open questions remain for later Chronicle work:

- ownership
- transferability
- delegation
- subject identity
- organization identity
- optional NFT wrappers

These questions matter, but they should remain downstream of the Asset Model v0 decision.

Chronicle Asset Model v0 does **not** require:

- contracts
- tokens
- ownership logic

It only requires a clean conceptual distinction:

- ReceiptOS Proof = truth substrate
- Chronicle Position = accumulated verified history asset
- Chronicle Bundle = transport format

## Summary

Chronicle Asset Model v0 answers the question:

**What is the asset in Chronicle?**

The answer is:

**Chronicle Position**

Not a single receipt.
Not a single proof.
Not a timeline event.
Not a viewer page.

A Chronicle Position is a portable accumulation of verified history.
That is the Chronicle-native asset concept.
