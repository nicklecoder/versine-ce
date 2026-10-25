---
id: wave-ticks-fit-b
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T15:51:16.11736363Z
relationships:
    - to: catalogue/content/wave-graphs-drawn-from-their-equation
      type: refines
      via: batch
---

In trig-graphs a drawn wave's x-axis is ticked at multiples of π/(2b), so every peak, trough and midline crossing falls on a tick: π/4 for b = 1, 2 or 1/2, π/6 for b = 3, with every other tick labeled (π/2, π, … or π/3, 2π/3, …). With π/4 ticks a b = 3 wave put its peaks at π/6 and 5π/6, between two ticks, and its period could not be read. check-answers.py fails any dot of a drawn graph that is neither on the y-axis nor on a tick.
