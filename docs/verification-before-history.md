# Verification Before History

In DNA replication, what matters is not *who* made the copy — it is whether the copy's correctness can be traced and re-established through independent checking mechanisms. Proofreading and mismatch repair are not a reputation system. They are a provenance preservation system: they carry forward the ability to verify, not a score of trustworthiness earned by the copier.

This maps directly onto Chronicle's three-layer model:
- Identifier answers *who*.
- History answers *what happened*.
- Reputation answers *what others think about it*.

DNA proofreading/repair operates entirely at the level of the first two — it establishes identity (this base, this position) and history (this is what was copied, and it re-verifies), and never touches anything resembling reputation. Correctness is carried forward as lineage, not as trust in an author.

Read end to end, the two pipelines mirror each other:

`payload → policy → authorization → execution → evidence → receipt_root → verification`
`information → replication → proofreading → repair → acceptance`

In both, the terminal goal is not trust in the executor. It is preserved reproducibility of truth through independent checking.

The invariant both systems converge on, independently:

> Correctness must survive the producer.

## Why This Also Explains Chronicle

There is a further layer implicit in this analogy, not yet stated directly: history is what remains after verification survives context.

- In DNA, this is the successfully replicated, repaired sequence — passed forward as the organism's lineage.
- In ReceiptOS, this is the admissible receipt — a claim that has survived independent recompute.
- In Chronicle, this is portable history — the record that persists once a receipt's admissibility no longer needs to be re-argued.

Chronicle can therefore be read as a layer *above* the Evidence Capsule Model, not a parallel one:

`execution → evidence → receipt → verification → history`

This is the same shape as the current working formula:

> Stealth executes.  
> ReceiptOS proves.  
> Crystal Receipt exports.  
> Chronicle records history.

The DNA analogy explains *why* the "proves" step has to exist at all between "executes" and "records history": without it, history has no mechanism for independent reproduction. It becomes a story someone tells about what happened, not a fact anyone can re-derive. Proofreading and mismatch repair are what let a genome accumulate a *history* (lineage) rather than merely a *narrative* (unverified copies asserted to be faithful). ReceiptOS's verification layer plays the identical role for Chronicle: it is what makes the difference between a history and a story.

## Possible Use

- A short, natural-sounding aside in technical conversation, not a headline claim.
- A potential opening paragraph or footnote in a more polished writeup of Chronicle's design philosophy.
- Internal grounding for why Chronicle sits after proof, not beside it.

