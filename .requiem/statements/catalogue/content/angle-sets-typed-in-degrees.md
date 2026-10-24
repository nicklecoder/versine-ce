---
id: angle-sets-typed-in-degrees
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T16:03:43.929986291Z
---

In trig-equations a set of solutions is typed with the solutions input only in degrees, where each angle is a plain number (30, 150, or 22.5), and a typed 30° is read as 30. In radians, where each angle would need a π the input cannot hold, the set on [0, 2π) and a general solution are chosen from four, and the wrong options are the slips students make: the right reference angle in the wrong quadrants, one angle alone, the other sign, the wrong period. check-answers.py finds every root numerically on a quarter-degree grid with no table of special angles, so a missing or extra solution is caught.
