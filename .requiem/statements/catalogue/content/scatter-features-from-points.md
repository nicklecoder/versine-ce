---
id: scatter-features-from-points
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T14:59:47.40780091Z
---

A quarter of the bivariate Association level asks which pattern a scatter plot shows: one straight line, a curve (nonlinear association), two separate clusters, or a straight line with one outlier. 8.SP.1 names clustering, outliers and nonlinear association beside positive and negative, and a review found the level had none of them. The four options are worded to exclude each other ("one straight-line pattern, with no gap or outlier"), so every decoy is false of the plot, and the key is drawn evenly among them. Each plot shows its own feature and no other, tested on the points as drawn: an x gap of at least 30% of the range only for clusters (at most 13% otherwise), a quadratic fit with under a fifth of a line's squared error only for a curve, and one point at least 8 RMS misses from the quadratic through the others, and a quarter of the y span off the line, only for an outlier. The checker classifies each plot from its points with its own wider margins, so a plot near a boundary fails the gate rather than being keyed by a guess.
