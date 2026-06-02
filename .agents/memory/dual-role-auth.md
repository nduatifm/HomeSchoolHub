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

## Invite acceptance must never demote primary role
`POST /api/team-invite/:token/accept` adds the "parent" capability to an accepter.
The correct pattern (line ~2048 in routes.ts):

```typescript
if (!user.roles?.includes("parent")) {
  const isTeacher = user.role === "teacher" || user.roles?.includes("teacher");
  const existingRoles = Array.from(new Set([...(user.roles ?? [user.role ?? ""]), "parent"]));
  // Never flip primary role to "parent" for a teacher — just append to array
  await storage.updateUser(userId, { role: isTeacher ? user.role : "parent", roles: existingRoles });
}
```

**Why it matters:** Teachers who add students via family-team and later accept co-parent
invites would have their primary role silently demoted to "parent", locking them out of
every teacher-only route.
