---
id: proof-step-is-new-and-equal
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T15:51:16.343134159Z
relationships:
    - to: catalogue/content/identity-choices-have-one-equal-option
      type: refines
      via: batch
---

identities' Next Step in a Proof asks for the next line of a fixed proof, and the question states the rule: the line must equal the last line and be a new line, a step on toward the other side, not back to one already written. In about half the rows one wrong option is such a step back, a line already written, which is equal but goes nowhere; the other wrong options are slips, not equal. check-answers.py takes as right the options equal to the last line that are not among the lines written, and requires exactly one. Equal options that move sideways (another identity applied to the same line) are never offered, since 'toward' cannot be judged for them without a canonical order the student does not see. The level draws from 44 proofs, seven of them derivations of the sum, difference and double-angle formulas themselves (see proofs-derive-the-formulas).
