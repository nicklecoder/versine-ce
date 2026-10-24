---
id: counting-restricted-counts-listed
namespace: catalogue/content
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T10:04:01.776783896Z
---

The counting skill checks every restricted count and every probability by counting by listing each arrangement or group with itertools in scripts/check-answers.py, not with the formula the explanation teaches. A restriction (a first digit that cannot be 0, two people kept together, a required committee member) is exactly where a shortcut such as 2 × (n − 1)! goes wrong, so a checker that reused the shortcut would share the mistake. The skill adds a Restrictions level that the Phase 3 plan did not list, for S-CP.9's harder counts, teaching that the limited place is filled first. No counting level carries a visual: a tree with hundreds of branches teaches less than the step counts multiplied, and the libraries stay small.
