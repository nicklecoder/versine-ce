---
id: skill-file-is-data
namespace: catalogue/structure
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.50187369Z
relationships:
    - to: catalogue/library/generators-are-build-tools
      type: refines
      via: batch
      unconfirmed: true
---

A skill module in web/skills/ imports nothing and computes nothing: it is levels (name, slug, blurb, par times), identity and graph edges only. check-catalogue.mjs fails the build if a skill exposes generate() again, so generators never ship to the browser.
