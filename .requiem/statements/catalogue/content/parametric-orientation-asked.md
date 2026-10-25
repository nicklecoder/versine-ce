---
id: parametric-orientation-asked
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:18.694878706Z
relationships:
    - to: catalogue/content/fixed-menu-key-moves
      type: depends_on
      via: batch
---

Plot Parametric asks which way a parametric ellipse x = ±A cos t + h, y = ±B sin t + k (or with cos and sin traded) runs as t increases, Clockwise or Counterclockwise, keyed about half each, as one of five equal shapes, so finding a point (a polynomial curve or a trig curve at a value of t) is two in five of the level rather than six in ten. Orientation is what a parametric curve has that its equation in x and y does not, and it is asked without a drawing, since a traced curve's arrowhead is the answer. check-answers.py finds the direction from the signed area of the points at t = 0°, 90°, 180° and 270°.
