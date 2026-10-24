---
id: distributions-empirical-rule
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T14:00:00Z
---

The distributions skill asks normal-curve questions only at whole numbers of standard deviations from the mean, and answers them with the 68-95-99.7 rule, split into one-sided bands of 34%, 13.5%, 2.35% and 0.15%. A z-table would need a lookup the app does not give, and these bands are the percents that S-ID.4 expects students to estimate by hand. The standard deviation is the population one, dividing by n. Every set is chosen so that it comes out whole, because the skill teaches the working and not the square root. The skill also adds a Shape & Center level, which the Phase 3 plan did not list: skew is named for its tail, and a tail pulls the mean past the median (S-ID.3). Which Spread builds on that level.
