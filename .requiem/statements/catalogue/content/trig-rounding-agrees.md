---
id: trig-rounding-agrees
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T11:07:21.392106516Z
relationships:
    - to: catalogue/content/rounded-factor-precision
      type: refines
      via: link
---

A trigonometry answer from a calculator (a side, an angle, a bearing, an area) is rounded only at the end. A problem is kept only when two conditions hold. First, the exact value is at least 0.05 of a unit at the asked place away from the halfway point. Second, the same working with every trig value copied to 4 decimal places, as a student copies a calculator screen, rounds to the same answer. A student who carries 4 places is then never marked wrong, and one who carries every digit gets the key. scripts/check-answers.py repeats both workings and asserts that they agree. This is the trigonometry counterpart of rounded-factor-precision. Exact answers such as √3/2 or 5√2/2 use the roots answer type, and the checker compares each one with the calculator value to within 1e-9.
