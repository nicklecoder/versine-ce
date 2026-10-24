---
id: bivariate-residuals-and-r-bands
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T13:00:00Z
---

The bivariate skill adds a Residuals level that the Phase 3 plan did not list. It covers actual minus predicted, and whether a point above the line means the line predicts too low, which is S-ID.6b's informal look at fit. Textbooks do not agree on where "strong" begins, so the skill states its bands in the blurb and in every explanation: strong is |r| of 0.7 or more, moderate 0.4 to 0.7, weak 0.1 to 0.4, and none below 0.1. A moderate band was added because a review found r = 0.45 keyed as weak, where most US texts call 0.4 to 0.7 moderate. Describing r is only asked of values well inside a band (strong 0.80 to 0.99, moderate 0.50 to 0.62, weak 0.18 to 0.32, none 0 to 0.04, either sign), and the checker asserts each asked value is more than 0.05 from every edge. Matching a scatter plot to r offers only values at least 0.4 apart, so the nearest one is never in doubt. Stories about a lurking variable are told only of variables that are actually correlated; a weak or absent correlation is shown with unrelated variables instead.
