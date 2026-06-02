---
name: Dual-role teacher-parent auth gap
description: Users can have a primary role plus additional roles in a roles[] array. Checking only user.role misses these users.
---

## Rule
**Never gate a route with `user.role !== "teacher"` alone.** Always pair it with the `roles` array:

```typescript
// Correct pattern
if (user?.role !== "teacher" && !user?.roles?.includes("teacher")) {
  return res.status(403).json({ error: "Teachers only" });
}

// Also correct (using the shared helper)
const isActorTeacher = (u: any) => u?.role === "teacher" || !!u?.roles?.includes("teacher");
```

## Why
A parent who adds the teacher capability has `role="parent"` and `roles=["parent","teacher"]`.
Checking only `role` makes them invisible to every teacher-only route — they get 403 on
assignment grading, returning, material creation, session management, etc.
The `isActorTeacher` helper at line ~5944 already does this correctly; route-level inline
checks were inconsistent.

## How to apply
- Before adding any `if (user.role !== "teacher")` guard, replace with the dual check above.
- The existing `isActorTeacher = (actor) => actor?.role === "teacher" || actor?.roles?.includes("teacher")` helper (inside the classroom routes closure) is the canonical form — reuse it where in scope.
- `requireClassroomOwner` is safe: it checks `classroom.teacherId === userId` (ID-based, not role-based).
