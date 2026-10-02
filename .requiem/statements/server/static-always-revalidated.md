---
id: static-always-revalidated
namespace: server
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T23:49:55.173784882Z
relationships:
    - to: server/no-build-step
      type: refines
      via: link
---

Every file of the browser app (the page, its modules, styles and libraries) is served with Cache-Control: no-cache, so the browser keeps a copy but asks the server before using it, and an unchanged file costs only a 304. With no Cache-Control header browsers guess how long to reuse a file, and after a deploy one can run a fresh module against a stale one it imports from: an export that no longer exists, and a blank page, the same failure check-imports catches before a deploy. This is what makes 'a change is live on refresh' true.
