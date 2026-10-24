---
id: figures-on-plane-without-axes
namespace: play/visuals
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T03:09:29.946817712Z
relationships:
    - to: play/visuals/name-primitives-after-geometry
      type: refines
      via: link
---

Geometry figures (angles, transversals, and later polygons) are drawn on the existing plane visual with axes: false and text marks for angle sizes, not on a new figure kind: the plane already draws points, segments, paths and regions in square units, and a second renderer for the same marks would be a primitive named after its lesson. Axes are switched off because a figure with no coordinates drawn on axes invites reading positions the question never gave.
