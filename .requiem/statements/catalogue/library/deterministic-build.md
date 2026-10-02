---
id: deterministic-build
namespace: catalogue/library
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.801017751Z
---

Library builds are deterministic: seeds come from skill id and level (never the clock or iteration order) and rows are sorted before writing, so an unchanged level produces a byte-identical file and diffs show only what moved.
