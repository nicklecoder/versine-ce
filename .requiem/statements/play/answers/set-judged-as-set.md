---
id: set-judged-as-set
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-23T23:42:02.523953756Z
relationships:
    - to: play/answers/permissive-input-canonical-display
      type: refines
      via: link
---

A solution-set answer (the solutions type) is judged as the set of numbers it names, not by how it is written: x < 3 and 3 > x, (−2, 5] and −2 < x ≤ 5, x = ±3 and 3, −3, 'x > −2 and x < 5' and −2 < x < 5 are each one answer, as are 'no solution' and 'all real numbers'. Inequalities, compound inequalities and absolute value all answer with a set, students write the same set many ways, and the set is what was asked. Its preview draws the typed text with ≤, ≥ and − set properly but never the normalised set, because showing 'all real numbers' for a mistaken 'x > −2 or x < 5' would do the student's checking for them. A level that asks about the notation itself (interval notation) is a choice instead, since a set answer would accept the inequality copied back.
