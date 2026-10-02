---
id: extension-points
namespace: server/extensions
kind: design
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-02T04:10:12.159620267Z
relationships:
    - to: server/no-build-step
      type: depends_on
      via: batch
    - to: server/one-household-per-install
      type: depends_on
      via: batch
    - to: server/api-contract
      type: depends_on
      via: batch
---

The browser app exposes a small set of extension points with harmless defaults: an authentication provider (default: household PINs) and a manifest of optional frontend modules it loads. Another server implementing server/api-contract adds screens and sign-in through these, never by forking the app, so every change to play, skills or review is written once. The manifest exists because there is no build step to bundle extras in.
