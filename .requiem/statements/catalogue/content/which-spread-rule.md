---
id: which-spread-rule
namespace: catalogue/content
kind: rule
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-24T13:27:45.966302351Z
---

Which Spread keys the IQR for data with an outlier (beyond 1.5 times the IQR from a quartile) or clearly skewed data (mean at least a quarter of the IQR from the median), and the standard deviation for symmetric data with no outlier; the rule is stated in the blurb and in each explanation. Symmetric lists are drawn mirrored about their middle so the claim is exact. Quartiles are the medians of the lower and upper halves, leaving out an odd count's middle value; this is stated in the blurb and in any prompt with an odd count, the checker uses the same method, and a list whose outlier verdict would change under the inclusive method is not asked. Values stay inside the context's believable range, and only an outlier may pass its top.
