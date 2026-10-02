---
id: card-shows-lost-to-review
namespace: review
kind: design
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:11.259544419Z
relationships:
    - to: review/card-shows-points
      type: refines
      via: batch
    - to: review/upkeep-decay
      type: depends_on
      via: batch
---

If upkeep decay is adopted, each map card also shows 'lost to review': points currently withheld by decay, tracked on its own so it is never confused with ordinary drops in accuracy or pace, and a decaying skill shows its daily loss. Decay is stored persistently, not recomputed.
