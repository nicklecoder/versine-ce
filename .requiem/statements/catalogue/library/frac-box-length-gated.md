---
id: frac-box-length-gated
namespace: catalogue/library
kind: question
status: superseded
provenance:
    type: dialogue
created_at: 2026-10-25T07:15:35.026723645Z
relationships:
    - to: catalogue/library/frac-answer-fits-its-boxes
      type: refines
      via: link
---

Open question: should scripts/check-library.py check fraction-box answers against the fraction boxes' 4-character top and bottom, as it checks int (7) and decimal (12) answers, so frac-answer-fits-its-boxes holds in every skill rather than only where a generator guards it? What hangs on it: binomial has 5 rows wider than the boxes at 85b18ac, and any future skill with large fraction-box answers would ship untypeable rows silently. The alternative is widening the boxes in web/ui/fracinput.js.
