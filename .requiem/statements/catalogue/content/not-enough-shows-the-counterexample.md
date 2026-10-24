---
id: not-enough-shows-the-counterexample
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T09:56:33.889389929Z
relationships:
    - to: catalogue/content/ssa-only-when-ambiguous
      type: refines
      via: batch
    - to: principles/no-answer-before-commit
      type: depends_on
      via: batch
---

When a congruence row's answer is 'not enough', the reveal draws the counterexample dashed: for SSA the second triangle the swinging side makes, for AAA a smaller copy sharing a corner. Showing why the marks fail teaches more than the verdict. It is drawn on reveal only, since drawing it while the question is open would give the answer away.
