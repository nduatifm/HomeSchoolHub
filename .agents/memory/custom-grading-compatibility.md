---
name: Custom grading compatibility
description: Compatibility rules between normalized classroom categories and legacy grading fields.
---

Treat the immutable classroom category identity as the source of truth. Whenever an assignment changes category, synchronize its legacy type: baseline categories use their baseline key, while custom categories use the legacy assignment bucket. Fold custom category weights into that same bucket when projecting the four legacy policy weights, and reject legacy policy edits when the classroom no longer has exactly the four baseline categories.

**Why:** Older clients still submit and calculate with the legacy assignment type and four fixed weights. Allowing these representations to drift can silently move assignments or produce different grades between current and legacy clients.

**How to apply:** Any category mutation, assignment create/edit/reassignment path, report calculation, or compatibility endpoint must preserve this mapping. An unchanged legacy type in a full-payload edit must not overwrite an existing custom category identity.

For historical reports, select the immutable policy/category snapshot effective at the report period end. Resolve each assignment through effective-dated history containing both its stable category ID and legacy bucket; current assignment fields are not valid historical evidence after reassignment.

**Why:** Category deletion and reassignment intentionally change current assignment fields. Without both historical values, older normalized and legacy policy snapshots classify the same assignment differently.

**How to apply:** Keep policy snapshot creation and assignment-history writes atomic with their current-state mutations. Historical snapshots must never derive active flags or custom composition from today’s category rows.

Every grading policy record, including test fixtures and one-time data scripts, must include an explicit category snapshot. Use a normalized snapshot for custom categories and an explicitly legacy snapshot for four-bucket policies.

**Why:** A policy with a missing snapshot is neither a valid normalized policy nor an explicitly legacy policy. Historical matching can then compare placeholder category IDs and produce a null grade even when graded submissions exist.

**How to apply:** Never insert a grading policy with only legacy weight columns. Build and persist the matching snapshot in the same write.