---
id: decoys-crossed-not-centred
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-25T02:18:42.713750644Z
relationships:
    - to: catalogue/library/strategy-not-from-surface
      type: refines
      via: link
---

When a choice question's wrong options are slips made on the way to the key, they are two slips crossed: the key, slip A, slip B, and both together, so every option is one slip from two others and the key sits no nearer the middle of the four than a wrong option does. Built the other way, each decoy one feature off the key, the key is the medoid (the option with least total edit distance to the rest) and can be picked by comparing the options without any mathematics: poly-functions Sketch From Factors had it at 92% against a chance of 25%. The numbers in a question are drawn rather than built from a small quotient, or the key's labels are the shortest and it can be picked by size (Oblique and Long Division both were). scripts/measure-medoid.py reports, per choice level, how often the key is the medoid, the outlier farthest from the rest and the longest label; a level keeps the medoid share at or under 40%. Applies to poly-division Long Division and Synthetic, poly-functions Sketch From Factors, rational-functions Oblique and Match the Graph.
