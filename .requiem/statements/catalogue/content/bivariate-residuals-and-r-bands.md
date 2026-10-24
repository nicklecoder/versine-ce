---
id: bivariate-residuals-and-r-bands
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T13:00:00Z
---

The bivariate skill adds a Residuals level that the Phase 3 plan did not list. It covers actual minus predicted, and whether a point above the line means the line predicts too low, which is S-ID.6b's informal look at fit. Textbooks do not agree on where "strong" begins, so describing r is only asked of values well inside a band: strong is 0.8 to 0.99, weak is 0.2 to 0.45, and none is 0 to 0.08, either sign. The checker's wider bands (strong from 0.7, weak 0.15 to 0.5, none to 0.1) report anything in between instead of judging it. Matching a scatter plot to r offers only values at least 0.4 apart, so the nearest one is never in doubt.
