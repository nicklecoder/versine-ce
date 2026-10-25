---
id: solids-in-oblique-view
namespace: play/visuals
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T04:08:50.422123038Z
relationships:
    - to: play/visuals/figures-on-plane-without-axes
      type: refines
      via: link
---

Solids (prisms, cylinders, cones, pyramids, spheres) are drawn on the plane with no axes in an oblique view: the front face true to scale, depth drawn back up and to the right at about half length, edges out of sight dashed, and a round end as an ellipse whose back half is dashed. No 3D renderer or new visual kind: the plane's segments and paths draw it, and an oblique view is the one textbooks use, so a student sees the solid the way it will be drawn on paper.
