---
id: polar-grid-on-the-plane
namespace: play/visuals
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:19.193765682Z
relationships:
    - to: play/visuals/name-primitives-after-geometry
      type: refines
      via: batch
---

A polar grid is a field of the plane visual, polar: { ring, spokes }, drawn in place of the square grid: circles every ring units about the origin, spokes every 15° with those on multiples of 30° heavier, and the angles 30°, 60°, ... written past the last ring. It is a field rather than a separate visual kind because everything drawn on it -- points, curves, labels, the answer withheld until committed -- is the plane's marks, checked by the same gate, and only the grid behind them differs (play/visuals/name-primitives-after-geometry). Polar graphs and plotted polar points use it: a rose or a limaçon is read by how far it reaches at each angle, which square gridlines hide, and on a Cartesian grid r = 4 cos 3θ and r = 4 sin 3θ are hard to tell apart. The grid's angle labels are the same on every problem, so they say nothing about an answer.
