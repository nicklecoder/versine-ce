---
id: subject-is-filing-not-ownership
namespace: catalogue/structure
kind: rule
modality: must_not
abstract: true
status: active
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.546949674Z
relationships:
    - to: catalogue/structure/subjects-and-categories
      type: refines
      via: batch
      unconfirmed: true
---

A subject is where a category is filed, not which branch owns it. Cross-cutting categories (Coordinates, Powers & Roots) are filed once where a student would look, with a comment naming where else they belong, and nothing in the engine treats a subject as ownership.
