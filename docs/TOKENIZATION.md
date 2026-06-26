# Tokenization

Chronicle does not begin by assuming NFTs are the final abstraction.

## Reuse what helps

Some existing standards may still be useful as transport or ownership layers:

- NFT-style ownership records
- metadata pointer conventions
- transfer semantics
- wallet compatibility
- market interoperability

## Ignore what distorts the model

Chronicle should reject NFT assumptions that collapse the receipt into:

- a JPEG surrogate
- pure speculative scarcity
- a marketplace listing
- a thin pointer with no verifiable substrate

## Possible tokenization models

### 1. Receipt-native objects first, optional token wrappers later
Receipts remain primary. Tokens reference them only if useful.

### 2. Chronicle-level tokenization
A composed Chronicle, not a single receipt, becomes the owned or traded object.

### 3. Split rights model
Verification object stays public or semi-public, while certain rights are tokenized separately.

### 4. Non-transferable and transferable layers
Some receipts may represent permanent attribution, while separate layers represent transferability or economic participation.

## Current stance

Tokenization is a downstream design question.
Chronicle exists to determine whether receipts deserve their own standard before forcing them into NFT assumptions.
