---
id: prompts-record-origin
namespace: review
kind: design
status: active
provenance:
    type: dialogue
created_at: 2026-10-02T23:49:56.301092908Z
relationships:
    - to: review/measure-review-health
      type: refines
      via: link
    - to: review/offer-card-atop-map
      type: depends_on
      via: link
---

A run started from a review prompt says so: the start-of-day offer sends origin review-offer, the warm-up banner review-warmup, and the server stores it with the run. The teacher's review health counts how often each prompt was started and passed, which is the evidence for whether the prompts are what get reviews done before deciding review/turn-on-decay. An unknown or missing origin is stored as nothing, never refused, so no client ever loses a run over a measure.
