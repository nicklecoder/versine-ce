---
id: one-ratio-fixes-the-quadrant
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T13:39:04.553035457Z
---

In unit-circle, a problem that gives one trigonometric ratio and asks for another always fixes the quadrant, either by naming it (θ is in quadrant III) or by giving the sign of a second function (cos θ < 0) that, with the given ratio's sign, leaves exactly one quadrant. One ratio alone fixes only the reference triangle: sin θ = 3/5 holds in quadrants I and II, where cos θ is 4/5 and −4/5, so an unfixed question has two right answers and would mark one of them wrong. check-answers.py places θ in the stated quadrant with the inverse function, and refuses a given ratio whose sign that quadrant does not allow.
