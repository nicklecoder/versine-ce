---
id: fail-visibly
namespace: principles
kind: principle
abstract: true
status: active
tags:
    - checks
provenance:
    type: dialogue
created_at: 2026-10-01T16:48:03.47861886Z
---

A fault should be caught by the tool that could introduce it and surfaced loudly, never papered over silently: a rule that can be broken silently is decoration, a check that cries wolf is worse than none, and every new check is verified to fail when it should.
