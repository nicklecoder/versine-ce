---
id: frac-answer-fits-its-boxes
namespace: catalogue/library
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T07:15:25.277270557Z
relationships:
    - to: catalogue/library/answer-fits-its-box
      type: refines
      via: link
---

Every fraction-box answer must fit the boxes it is typed into: four characters on top, a minus among them, and four below (maxlength 4 on each box in web/ui/fracinput.js), so a whole number answered in the fraction box is at most 9999 or -999. A box that stops typing short of the answer makes the problem impossible to get right while looking fine, and the 4-character limit had never been checked for fractions: series at 85b18ac had 586 of its 7,000 rows untypeable (1 + 2 + ... + 200 = 20100, salaries of $446,496, 781248/3125), binomial 5. The series generator redraws any row whose answer is wider (fits() in tools/generators/series.js).
