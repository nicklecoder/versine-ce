---
id: radian-coefficients-as-fractions
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T12:40:50.6358444Z
relationships:
    - to: catalogue/content/pi-answers-as-a-coefficient
      type: refines
      note: radians uses a fraction coefficient, since its measures are thirds and ninths of pi
      via: link
---

In the radians skill an exact angle, arc length or sector area is typed as the coefficient of π, a fraction, into a blank set before a π the prompt already writes (θ = ▢π), and the skill's input is the fraction box. Radian measures are thirds, sixths, ninths and twelfths of π (5π/6, 40π/9), which no decimal box can hold exactly, so this differs from the circles skill's decimal coefficient on purpose. Every prompt says which form it wants: degrees, a multiple of π, or plain radians to a stated place. A rounded conversion uses the calculator's π and is kept only where working with π as 3.1416 rounds to the same place.
