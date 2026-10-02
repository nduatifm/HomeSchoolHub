---
name: Assessment review trust boundaries
description: Historical assessment fidelity and privacy decisions for reviews
---

Treat saved submission-time question snapshots as the authoritative wording and options for a review. When a legacy submission has no snapshot, current assignment questions are only an explicitly labeled approximation; answer IDs without matching prompts remain unattributed. Never imply a later edit was the question the student answered.

**Why:** Teachers can edit assessment questions after submission. Pairing saved responses with today's prompts silently changes the historical record, especially for removed or reordered questions.

**How to apply:** Any future review, export, or report should prefer the saved snapshot. If it is missing or malformed, warn about the uncertainty and keep unmatched answers visible separately.

Individual correctness cannot be recovered from a saved total grade. Until historical keys/results are persisted, comparisons must explicitly reference the current answer key and exclude changed or unverifiable questions.

**Why:** Submission snapshots preserve prompts, not the historical key or per-question grading results. Current keys may have been edited even when prompts still match.

**How to apply:** Treat teacher display comparisons as provisional checks, never as historical verification or a reason to overwrite saved grades. Keep malformed-data classification separate from family review behavior.

Treat answer keys and provisional auto-scores as private until the teacher explicitly grades or releases them. Student and parent views must be filtered at the API boundary, including aggregates, rather than merely hiding values in the UI.

**Why:** Shared assignment responses and grade summaries can disclose correct answers or unreviewed results even if the review page itself hides them.

**How to apply:** Audit every new classroom assignment or grade-reporting endpoint for both direct fields and derived values available to family roles.

When cleaning text-backed choice keys, preserve a renamed selection only when the editor knows which unique option was changed. Do not infer renames from a schema-only server update or transfer a key between duplicate labels.

**Why:** Text labels do not provide stable option identity. Guessing a replacement can silently mark a different answer as correct, especially when labels become duplicates under grading normalization.

**How to apply:** Purge missing, blank, or ambiguous choices at current-assignment and teacher-draft write boundaries. Keep cleanup separate from saved submission answers, snapshots, and grades.

Authorizing a classroom does not authorize arbitrary assignment IDs supplied alongside it. Validate parent-child association before fetching private form data or seeding a teacher draft.

**Why:** Foreign keys guarantee that both records exist, not that an assignment belongs to the authorized classroom. Copying published keys into drafts can otherwise disclose another teacher's key through a partial request.

**How to apply:** Scope assignment lookups to the authorized classroom, including draft initialization, and reject mismatches before reading or writing a draft. Cover the boundary with two-teacher/two-classroom tests.