---
id: contract-edition-adapter
namespace: server
kind: design
status: proposed
provenance:
    type: dialogue
created_at: 2026-10-02T05:46:18.875338267Z
relationships:
    - to: server/api-contract
      type: refines
      via: link
    - to: server/extensions/extension-points
      type: depends_on
      via: link
---

The contract suite (contract/) reaches each edition through a small adapter, a Python file defining Edition: it hands out fresh, isolated groups (a teacher signed in, no students), adds students, and declares which suites it serves. Every assertion goes through the API itself. Core is required of every server; pin-accounts (setup, self-serve profiles, PIN login, lockout, logout) is optional, because an edition may replace sign-in through the browser app's authentication provider. Isolation tests use two groups, which on the community edition are two servers and on a many-household server are two households on one, so the same test pins play/comparisons-stay-in-the-group for both. The community adapter runs real uvicorn processes on throwaway databases, about 16 seconds for the suite.
