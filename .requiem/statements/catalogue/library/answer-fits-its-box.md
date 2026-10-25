---
id: answer-fits-its-box
namespace: catalogue/library
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T01:27:39.461111556Z
relationships:
    - to: catalogue/library/answer-typeable-in-its-boxes
      type: refines
      via: link
---

Every int and decimal answer in a library must fit the number of characters its input box accepts (7 for an integer, 12 for a decimal, set in web/ui/answerinput.js), checked by check-library.py. A box that stops typing short of the answer makes the problem impossible to get right while looking fine: scientific notation read back, −0.00000276, ran past the old 9-character decimal box on 57 problems.
