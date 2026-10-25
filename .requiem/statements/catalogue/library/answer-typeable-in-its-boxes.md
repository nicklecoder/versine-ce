---
id: answer-typeable-in-its-boxes
namespace: catalogue/library
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:09:51.917883879Z
relationships:
    - to: catalogue/library/frac-box-length-gated
      type: supersedes
      via: link
---

Every answer in every library must be typeable in the boxes its answer type offers on that level, and scripts/check-library.py fails the build on any row that is not, for every skill rather than only where a generator guards it. The limits are the maxlength of each widget in web/ui/: the int box 7 characters and the decimal box 12 (answerinput.js); each fraction box 4, a minus counting among the top's, so a whole number in a fraction box is at most 9999 or -999 (fracinput.js); the mixed number's whole, top and bottom 3 each, unsigned (mixedinput.js); each coordinate of a pair 7, written as a whole number, fraction or terminating decimal (pairinput.js); and the free box 80 (freeinput.js), which takes every other typed answer type. An answer counts as typeable when its shortest accepted writing fits: the reduced fraction for frac, mixed and pair, and the shortest accept form for int, decimal and free. A box that stops typing short of the answer makes the problem impossible to get right while looking fine; series once shipped 586 such fraction answers and binomial 5, unchecked because only int and decimal were gated. Widening the fraction boxes was the alternative and was not taken: once series and binomial were redrawn every library row fit the existing boxes, and an answer too wide for four characters a box is a sign the problem is no longer hand-sized either.
