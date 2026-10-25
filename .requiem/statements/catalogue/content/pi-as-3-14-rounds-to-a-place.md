---
id: pi-as-3-14-rounds-to-a-place
namespace: catalogue/content
kind: design
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T07:45:03.6427358Z
relationships:
    - to: catalogue/content/pi-answers-as-a-coefficient
      type: refines
      via: batch
    - to: play/answers/rounding-keeps-places
      type: depends_on
      via: link
---

A question that takes π as 3.14 says 'Use 3.14 for π and round to 1 decimal place', and its decimal answer carries places: 1, rounded half up exactly from the exact product, so the answer is one written value and the box can hint when a right value is written to the wrong place. Without the instruction a 3.14 answer like 19.625 has several defensible written forms. An inverse question whose answer comes out exact (a diameter from a 3.14 circumference) keeps 'Use 3.14 for π.' alone, because there is nothing to round. Answers kept in terms of π are unchanged.
