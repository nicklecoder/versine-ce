---
id: point-names-outside-the-shape
namespace: catalogue/content
kind: rule
modality: should
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T09:56:33.594769397Z
relationships:
    - to: catalogue/content/height-drawn-clear-of-slants
      type: refines
      via: batch
---

Point names on coordinate figures are placed outward from their polygon (along the reversed corner bisector, or away from the one neighbour or the centroid), then turned or pushed out until the name clears every edge, dot and other name at the phone's grid unit; the axes and tick numbers are avoided where possible. The renderer's fixed up-right offset put names on edges and on other points (coord-geometry, quadrilaterals Verify on Coordinates), so a student could not tell which dot was which. Slope labels on the reveal are placed the same way at their side's midpoint.
