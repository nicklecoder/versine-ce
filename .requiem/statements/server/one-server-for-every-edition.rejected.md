---
id: one-server-for-every-edition
rejected_at: 2026-10-02T05:17:25.518069522Z
see_instead: server/api-contract
---

One server serving both single-household installs and many-household deployments through a database abstraction or ORM over SQLite and Postgres. It breaks server/one-household-per-install and the no-ORM choice, and would make the home install carry complexity it never uses.
