---
id: wave-graphs-drawn-from-their-equation
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T14:10:10.111739332Z
---

In trig-graphs, a drawn wave is the student's only copy of the function, so every point of its curve lies on the equation the question is about (the stored option, for Equation From a Graph): x is sampled on exact tenths and y may differ from the equation by no more than its own rounding to a tenth, and every dot marks a true peak or trough. Peaks fall at multiples of π/4 and the axis is marked every π/4 and labelled every π/2, with a light line at each whole y, so amplitude, midline and period can be read rather than guessed. check-answers.py evaluates the equation in each text as written, finds the period by testing shifts and the extremes by searching one period, and checks every drawn point against it.
