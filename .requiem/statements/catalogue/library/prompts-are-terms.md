---
id: prompts-are-terms
namespace: catalogue/library
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.835194968Z
---

Prompts are lists of typed terms (num, frac, mixed, op, blank, prose, pow, root, ...) rendered by the app, never HTML strings, so notation can be restyled everywhere at once, nothing from the catalogue reaches innerHTML, and malformed prompts are caught at the deploy gate.
