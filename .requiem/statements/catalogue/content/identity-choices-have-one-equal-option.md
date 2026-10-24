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

In identities, every choice question (simplify an expression, write a sum as a single function, pick an exact value, or pick the next line of a proof) has exactly one option equal to the expression, or to the proof's last line, and the other three are not equal to it at all: each is a single slip a student makes, a flipped sign, a dropped square, a function swapped for its cofunction or reciprocal, or the negative of the answer. An option that was also equal, only in another form, would be a second right answer marked wrong. Expressions are written once in ASCII and drawn for the student from that text, and check-answers.py evaluates every option at seven angles, requires exactly one to match, and checks that each line of a proof so far equals the one before.
