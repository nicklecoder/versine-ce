---
id: visual-registry
namespace: play/visuals
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:04.186536952Z
---

Each problem names a visual kind and web/ui/visuals.js dispatches it; the play screen never learns which kinds exist, so a new picture is one registry entry. Each kind declares a data schema beside its renderer, published for the Python gate.
