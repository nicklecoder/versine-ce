---
id: identity-choices-have-one-equal-option
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T14:32:50.003272108Z
---

In identities, every choice question (simplify an expression, write a sum as a single function, pick an exact value, or pick the next line of a proof) has exactly one right option. For an expression, that is the one option equal to it, and the other three are not equal at all: each is a slip a student makes (see identity-decoys-are-misconceptions). For a proof, the right option is the one equal to the last line that is not a line already written; a wrong option may be a line already written, a step back (see proof-step-is-new-and-equal), and the rest are not equal. An option that was also equal, only in another form, would be a second right answer marked wrong. Expressions are written once in ASCII and drawn for the student from that text, and check-answers.py evaluates every option at seven angles, requires exactly one right option, and checks that each line of a proof so far equals the one before.
