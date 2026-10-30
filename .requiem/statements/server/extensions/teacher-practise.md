---
id: teacher-practise
namespace: server/extensions
kind: design
modality: must
status: active
provenance:
    type: dialogue
created_at: 2026-10-30T06:52:15.857153418Z
relationships:
    - to: server/extensions/extension-points
      type: refines
      via: link
---

An extension may replace the teacher console's Practise button through setTeacherPractise({ label, run }): the console then shows that label and calls run instead of opening the map. With no extension the button keeps its default, the teacher practising on the map as themselves. An edition whose accounts are run by an adult who should hand the device to a student rather than play needs this; a home install does not.
