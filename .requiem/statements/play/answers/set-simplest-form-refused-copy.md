---
id: set-simplest-form-refused-copy
namespace: play/answers
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:27:42.26228283Z
relationships:
    - to: play/answers/value-and-form-separate
      type: refines
      via: link
---

A solution-set answer marked requireSimplest (compound-ineq And or Or?) is refused, with the hint 'x < −1 and x < −2 is right, but it isn't combined into its simplest form yet.', when it is written in more pieces than the set needs -- pieces being the relations or intervals typed, needed being one per run of the set and one for no solution or every number. So x < −1 and x < −2 for x < −2, x > −2 and x < 5 for −2 < x < 5, and x < 5 or x >= −7 for all real numbers are refused, while x = 3 or x = −3, x = ±3 and x ≠ 3 still pass. The solutions type judges by the set and so accepted the question copied back, and combining the two conditions is the whole skill. parseSet reports pieces beside the value; combined() in solutions.js decides; the session passes the parse to isSimplest.
