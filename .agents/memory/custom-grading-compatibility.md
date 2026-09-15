---
name: Custom grading compatibility
description: Compatibility rules between normalized classroom categories and legacy grading fields.
---

Treat the immutable classroom category identity as the source of truth. Whenever an assignment changes category, synchronize its legacy type: baseline categories use their baseline key, while custom categories use the legacy assignment bucket. Fold custom category weights into that same bucket when projecting the four legacy policy weights, and reject legacy policy edits when the classroom no longer has exactly the four baseline categories.

**Why:** Older clients still submit and calculate with the legacy assignment type and four fixed weights. Allowing these representations to drift can silently move assignments or produce different grades between current and legacy clients.

**How to apply:** Any category mutation, assignment create/edit/reassignment path, report calculation, or compatibility endpoint must preserve this mapping. An unchanged legacy type in a full-payload edit must not overwrite an existing custom category identity.