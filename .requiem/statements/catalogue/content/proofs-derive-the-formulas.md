---
id: proofs-derive-the-formulas
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T17:58:49.388312786Z
relationships:
    - to: catalogue/content/proof-step-is-new-and-equal
      type: refines
      via: link
---

identities' Next Step in a Proof also derives the formulas the earlier levels state (F-TF.9), not only identities that follow from them: cos(α − β) from the length of a chord of the unit circle, cos(α + β) from it with −β, sin(α + β) through the cofunction cos(π/2 − x), tan(α + β) from the sine and cosine sums divided through by cos α cos β, and sin 2θ, cos 2θ and tan 2θ from the sums with both angles θ. Each step is one algebraic line equal to the last, so the existing checker verifies it by evaluating both at seven angles, now with α and β given values beside θ. The one geometric step, that turning both ends of a chord by β keeps its length, is an equality of values too, (cos α − cos β)² + (sin α − sin β)² = (cos(α − β) − 1)² + sin²(α − β), so the checker verifies it the same way; it does not check the reason given, only that the line is equal.
