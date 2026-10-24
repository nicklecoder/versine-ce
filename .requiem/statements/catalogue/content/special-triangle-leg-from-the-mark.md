---
id: special-triangle-leg-from-the-mark
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T15:51:16.201038259Z
---

trig-ratios' 30-60-90 level asks for x without naming the leg ('find the exact length of x'): the figure's angle mark, 30° or 60°, decides whether x is the short leg or the long one, which is the skill. The text records the marked angle and each side by its place from it (angle 60, adjacent 6, want opposite), and check-answers.py works the answer from a hypotenuse-1 triangle with that angle and reads the figure back: the marked angle is the one in the text, and the given length and the x sit on the sides the text names, found from the drawing's corners.
