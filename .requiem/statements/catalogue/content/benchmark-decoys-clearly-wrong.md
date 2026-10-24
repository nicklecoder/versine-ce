---
id: benchmark-decoys-clearly-wrong
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T09:56:33.75254782Z
relationships:
    - to: catalogue/content/units-familiarity-rows
      type: refines
      via: batch
---

A temperature benchmark (which is about right for a hot oven?) has one choice in the item's believable range and decoys clearly outside it, at least 15 degrees beyond the range and never a value the thing really takes, hand-chosen per item and per scale: an oven at 220 °C has 100 °C and 428 °C as decoys, not 180 °C. Each item's range is kept in the checker, which asserts the key lies in it and every decoy lies well outside. A plausible decoy makes the item a matter of opinion.
