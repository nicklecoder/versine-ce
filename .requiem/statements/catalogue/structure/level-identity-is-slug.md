---
id: level-identity-is-slug
namespace: catalogue/structure
kind: rule
modality: must
status: active
tags:
    - data
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.622726587Z
relationships:
    - to: server/server-has-no-js
      type: depends_on
      note: level order reaches the server via the manifest
      via: batch
      unconfirmed: true
---

A level's identity is an authored slug, fixed once seeded from its name, never its index. Renaming a level is safe; editing a slug is not. Positions are re-derived from slugs on every read, so inserting a level never reattributes a student's history.
