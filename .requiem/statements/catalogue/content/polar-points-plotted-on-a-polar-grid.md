---
id: polar-points-plotted-on-a-polar-grid
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T09:21:18.743120047Z
relationships:
    - to: catalogue/content/fixed-menu-key-moves
      type: depends_on
      via: batch
    - to: play/visuals/polar-grid-on-the-plane
      type: depends_on
      via: batch
---

Polar to Rectangular asks, in a quarter of its rows, which of four lettered points on a polar grid is a given polar point (r, θ), in degrees or radians. The four points are on the ring at |r| and cross two real misreadings: for a negative r, its sign ignored and θ turned clockwise; for a positive r, θ turned clockwise and θ measured from the positive y-axis (a positive r keeps to the 30° family, since at 45° the two readings land together). Plotting is what TEKS P.3D's graphing in polar coordinates starts from, and a negative r is where students go wrong. The letters A to D are a fixed menu and the key moves among them; check-answers.py places the point from the text and finds the one dot there.
