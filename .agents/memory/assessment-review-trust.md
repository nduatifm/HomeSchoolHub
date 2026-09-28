---
name: Assessment review trust boundaries
description: Historical assessment fidelity and privacy decisions for reviews
---

Treat saved submission-time question snapshots as the authoritative wording and options for a review. When a legacy submission has no snapshot, current assignment questions are only an explicitly labeled approximation; answer IDs without matching prompts remain unattributed. Never imply a later edit was the question the student answered.

**Why:** Teachers can edit assessment questions after submission. Pairing saved responses with today's prompts silently changes the historical record, especially for removed or reordered questions.

**How to apply:** Any future review, export, or report should prefer the saved snapshot. If it is missing or malformed, warn about the uncertainty and keep unmatched answers visible separately.

Treat answer keys and provisional auto-scores as private until the teacher explicitly grades or releases them. Student and parent views must be filtered at the API boundary, including aggregates, rather than merely hiding values in the UI.

**Why:** Shared assignment responses and grade summaries can disclose correct answers or unreviewed results even if the review page itself hides them.

**How to apply:** Audit every new classroom assignment or grade-reporting endpoint for both direct fields and derived values available to family roles.