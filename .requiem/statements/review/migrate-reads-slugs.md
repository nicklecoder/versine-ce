---
id: migrate-reads-slugs
namespace: review
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T00:33:04.131537431Z
relationships:
    - to: review/migrate-without-loss
      type: refines
      via: batch
---

The review migration decides which skills are finished from mastered_slugs against the deployed manifest, never from the integer mastered list or level_count, and must not assume a finished skill's dependencies are finished. The 2026-10-01 server snapshot (commit 3e5eacf) had a row whose integer list missed a level its slug list held, a test account with a stale level_count, and a skill finished before the gate existed while its dependency was not.
