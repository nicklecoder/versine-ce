---
id: letters-side-by-side-multiply
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T00:07:22.227096375Z
relationships:
    - to: play/answers/answer-syntax
      type: refines
      via: link
---

Letters typed side by side are a product, as they are on paper: 6ab is 6·a·b and 3xy^2 is 3·x·y², with a power on the last letter alone, not on the run. A run of letters is split into single letters except where a name the parser knows (sqrt, abs, root, pi) starts, which is taken whole. Monomials and polynomials in two letters cannot be answered otherwise. The cost is that a misspelled function name such as sin(x) is read as s·i·n·x rather than refused; the preview shows that reading in italic letters, and it is marked wrong rather than accepted, since it equals nothing a level asks for.
