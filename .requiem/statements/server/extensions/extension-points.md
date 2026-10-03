---
id: extension-points
namespace: server/extensions
kind: design
status: active
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

The browser app has extension points with harmless defaults, loaded from web/extensions.json, which this project ships with no modules: a home install loads nothing and behaves exactly as if the points did not exist. A server implementing server/api-contract can serve its own list, and each module it names gets four sockets: replace the sign-in screen (default: this install's PIN profiles), add a screen reached by route name, add a top-bar link for given roles, and set a gate policy (server/extensions/gate-policy). A module that fails to load is reported on the console and skipped, so the app starts on its defaults rather than not at all. Another edition adds what it needs through these, never by forking the app, so every change to play, skills or review is written once; the list is a file because there is no build step to bundle extras in. When an extension replaces sign-in, the screens that belong to this install's own PIN accounts -- adding a teacher by PIN in the console, the hint that students make their own profiles -- step aside, since accounts are then the extension's; a home install, with no extension, keeps them.
