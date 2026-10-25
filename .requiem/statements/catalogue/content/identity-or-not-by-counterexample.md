---
id: identity-or-not-by-counterexample
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T17:11:09.394614453Z
relationships:
    - to: catalogue/content/identity-choices-have-one-equal-option
      type: refines
      via: link
---

identities has an Identity or Not? level, after Double Angle and before Next Step in a Proof, because telling an identity from an equation that only sometimes holds is what makes a proof necessary: an identity holds wherever both sides are defined, one angle where both sides are defined and differ disproves an equation, and no number of angles where they agree proves one. About four rows in five ask whether an equation is always true, half of them identities from the earlier levels and half the slips those levels warn against (sin 2θ = 2 sin θ, sin(α + β) = sin α + sin β, tan θ = cos θ/sin θ, √(sin²θ) = sin θ, sin θ + cos θ = 1), most of which hold at some special angles, which the explanation names, so a single angle tried would mislead. The rest say the equation is not an identity and ask at which of four angles it fails: exactly one has both sides defined and unequal, each of the others makes it true or leaves a side undefined, and at least one makes it true. check-answers.py classifies every equation itself, evaluating both sides at about 440 angles (and pairs of angles for α and β) with an evaluator that calls a value undefined at a zero denominator or a negative square root, confirms the stated counterexample, and requires exactly one failing option.
