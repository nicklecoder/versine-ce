---
id: versioned-releases
namespace: deploy
kind: decision
status: active
provenance:
    type: dialogue
created_at: 2026-10-03T06:23:47.46379363Z
relationships:
    - to: server/api-contract
      type: depends_on
      via: batch
    - to: deploy/auto-update
      type: refines
      note: releases sit beside the main-following updater; they do not replace it
      via: batch
---

versine-ce publishes deliberate, versioned releases, tagged vMAJOR.MINOR.PATCH on main when a set of changes is worth adopting, each with notes in CHANGELOG.md. The version describes the API contract, since that is what another server depends on: MAJOR when a server that passed the previous contract suite would fail the new one, MINOR for anything added (skills, levels, optional contract suites, extension points with harmless defaults), PATCH for fixes. Home installs keep following main through update.sh exactly as before; a release is for anyone who wants to pin a known version, and its notes are useful to home installs too.
