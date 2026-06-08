# Lyra Preparatory — Security Audit Report

**Date:** 2026-06-08  
**Scope:** Full-stack security audit of the Lyra Preparatory tutoring platform.  
**Outcome:** All critical and high-severity findings remediated. All medium and low findings addressed.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Fixed |
| High | 7 | Fixed (2 were false positives — already protected) |
| Medium | 5 | Fixed |
| Low | 2 | Fixed |

---

## Critical Findings

### C1 — Session Tokens Exposed to JavaScript (XSS Token Theft) — FIXED

**Before:** Every auth flow stored the session token in `localStorage.setItem("sessionId", ...)`. All fetch calls read it via `localStorage.getItem("sessionId")` and sent it as `Authorization: Bearer <token>`. Furthermore, the token was also returned in every auth JSON response (`{ sessionId, user, ... }`). Any XSS vulnerability could silently exfiltrate the token and replay it from any origin.

**After:**
- Server sets a `lyra_session` **httpOnly cookie** after every successful login/signup. httpOnly cookies are never accessible to JavaScript.
- **`sessionId` removed from all auth JSON responses** (login, student signup, Google student signup, Google auth). Session establishment is entirely cookie-based.
- `client/src/lib/queryClient.ts` now uses `credentials: "include"` on all requests; **no Authorization header, no localStorage token reads whatsoever** — all three upload helpers (`apiRequest`, `apiUpload`, `apiUploadWithProgress`) were also cleaned.
- `client/src/contexts/AuthContext.tsx` no longer reads or writes any session-related keys to `localStorage`.
- **Impersonation fully server-side (final fix):** Admin "become user" and parent "view as child" no longer create a second session token. Instead, `POST /api/admin/become` and `POST /api/parent/become-child` update the caller's own `AuthSession` row (`impersonatingUserId Int?` column added). `resolveSessionUserId` returns `impersonatingUserId ?? userId` as the effective identity and exposes `realUserId` separately. New `POST /api/admin/stop-impersonating` and `POST /api/parent/stop-impersonating` clear the field. `POST /api/auth/me` returns `impersonatedBy: { id, name, role, isAdmin, isSuperAdmin }` so banners use live context data instead of localStorage. `requireAdmin`/`requireSuperAdmin` check `realUserId` so admin privileges are preserved during impersonation.
- `server/routes.ts`: `resolveSessionUserId` reads **only** the httpOnly cookie — the Authorization header code path is gone entirely.

**Files changed:** `server/routes.ts`, `server/index.ts`, `prisma/schema.prisma`, `client/src/contexts/AuthContext.tsx`, `client/src/lib/queryClient.ts`, `client/src/components/AdminImpersonatorPanel.tsx`, `client/src/components/ImpersonationBanner.tsx`, `client/src/components/ManagedChildBanner.tsx`, `client/src/pages/ParentChildrenPage.tsx`, `client/src/pages/ClassroomMaterialPage.tsx`, `client/src/pages/Profile.tsx`, `client/src/pages/classroom/NewAssignmentPage.tsx`, `client/src/components/DevRoleSwitcher.tsx`

---

## High Findings

### H1 — No Rate Limiting on Auth Endpoints — FIXED

**Before:** No rate limiting. Brute-force attacks against `/api/auth/login` were unrestricted.

**After:** `express-rate-limit` added in `server/index.ts`:
- **Auth routes** (`/api/auth/*`) and invite routes (`/api/students/*`): 10 requests per 15 minutes per IP. Enforced in all environments (not just production).
- **All API routes** (`/api/*`): 100 req/min in production, 500 req/min in development.
- `app.set("trust proxy", 1)` added so rate limiting correctly reads `X-Forwarded-For` in Replit's proxied environment.

### H2 — No Security Headers — FIXED

**Before:** No `Helmet` middleware. No `Content-Security-Policy`, `X-Frame-Options`, `HSTS`, or other hardening headers.

**After:** `helmet` added in `server/index.ts` with:
- **CSP:** `default-src 'self'`; explicit allowlists for Google OAuth, Cloudinary images, Google Fonts.
- **X-Frame-Options:** `DENY` — prevents clickjacking.
- **HSTS:** 1-year max-age with subdomains (production only).
- **CORS:** `cors` package restricts cross-origin requests to known origins (`CLIENT_URL`, `.replit.app`, `.replit.dev`).

### H3 — IDOR: Assignment Submit Allows Spoofed studentId — FIXED

**Before:** `POST /api/assignments/:assignmentId/submit` accepted `studentId` from the request body without verifying the caller owned that student record. Any authenticated user could submit on behalf of another student.

**After:** The route now fetches the caller's student profile via `storage.getStudentByUserId(req.session.userId)` and returns `403` if the body's `studentId` doesn't match.

### H4 — IDOR: Student Assignment Submit Without Ownership Check — FIXED

**Before:** `PATCH /api/student-assignments/:id/submit` fetched the record by ID and updated it without verifying the caller was the owning student.

**After:** The route now fetches the `StudentAssignment` by ID, then fetches the associated `Student` and asserts `student.userId === req.session.userId`. Returns `403` on mismatch.

### H5 — Classroom Notifications Ownership — ALREADY PROTECTED (False Positive)

`GET /api/students/:studentId/classroom-notifications` already verified the caller is the student owner, a team parent member, the assigned teacher, or an admin. No changes needed.

### H6 — Team Member PATCH/DELETE Cross-Child Tampering — ALREADY PROTECTED (False Positive)

Both endpoints already scoped the `childTeamMember` lookup with `{ id: memberId, childId: studentId }`. No changes needed.

### H7 — Admin SQL Endpoint Missing Auth + Allows DML — FIXED

**Before:** `POST /api/admin/sql` had **no authentication middleware** — any unauthenticated caller could execute arbitrary SQL queries against the production database.

**After:**
- Added `requireSuperAdmin` middleware (was entirely absent).
- Restricted allowed SQL to `SELECT`, `WITH`, and `EXPLAIN` statements only — all DML/DDL is rejected with HTTP 403.
- Removed the `$executeRawUnsafe` code path entirely.

---

## Medium Findings

### M1 — HTML Injection in Email Templates — FIXED

**Before:** User-controlled values (`name`, `studentName`, `parentName`, `title`, `body`) were interpolated directly into HTML email templates without escaping.

**After:** Added `escapeHtml()` helper in `server/utils/emailService.ts` that encodes `& < > " '`. Applied to all user-derived values in all five email functions (`sendVerificationEmail`, `sendStudentInviteEmail`, `sendTeamInviteEmail`, `sendPasswordResetEmail`, `sendNotificationEmail`).

### M2 — No Content-Type Enforcement — FIXED

**Before:** No validation of `Content-Type` on mutating API requests. Malformed requests (wrong payload type) could bypass validation or trigger unexpected parser behavior.

**After:** Added middleware in `server/index.ts` that rejects `POST`, `PUT`, and `PATCH` requests to `/api/*` that do not declare `application/json` or `multipart/form-data` as their content type, returning HTTP 415.

### M3 — No Auth Event Logging — FIXED

**Before:** No persistent record of authentication activity. Impossible to detect or investigate brute-force attacks, account takeover attempts, or session anomalies.

**After:** Added `server/utils/authLogger.ts` — a structured auth event logger that appends JSONL entries to `server/logs/auth-events.jsonl`. Events recorded: `login_success`, `login_failure` (with reason), `logout`, `google_auth`, `student_signup`, `password_reset_success`. Each entry includes timestamp, event type, userId, email, IP address, and user-agent.

### M4 — Replit Dev Banner Loaded Unconditionally — FIXED

**Before:** `client/index.html` loaded `https://replit.com/public/js/replit-dev-banner.js` unconditionally in production, with no SRI hash.

**After:** Replaced with an inline guard script that only loads the banner when the hostname is not `localhost`, `.replit.app`, `.replit.dev`, or custom production domains — i.e., only in Replit's web preview environment during active development.

### M5 — No CORS Policy — FIXED

**Before:** No CORS middleware. Browsers could be tricked into making credentialed cross-origin requests from arbitrary origins.

**After:** `cors` middleware with explicit origin allowlist (see H2 above).

---

## Low Findings

### L1 — bcrypt Cost Factor Too Low — FIXED

**Before:** `bcrypt.hash(password, 10)` — adequate but below current recommendations.

**After:** `bcrypt.hash(password, 12)` — approximately 4x more compute per hash, materially harder to brute-force offline.

### L2 — Vite CVE-2025-30208 (Path Traversal) — FIXED

The project was using `vite ^5.4.14` which is affected by CVE-2025-30208 (path traversal via `@fs` URLs). The patched version is `5.4.15+`.

**After:** Upgraded to `vite@5.4.21` via `npm install vite@^5.4.15`. Verified with `node -e "require('./node_modules/vite/package.json').version"` → `5.4.21`.

---

## Residual Risk

1. **Admin SQL audit logging**: Even with the SELECT-only restriction, raw SQL access to production data is a significant privilege. Adding a persistent `AdminSqlLog` table is tracked as follow-up task #234.

2. **Content-Security-Policy `'unsafe-inline'` for scripts**: Required by the current React/Vite build (no nonce/hash injection). A future improvement is to adopt a nonce-based CSP via the Vite build pipeline.

---

## Packages Added

| Package | Purpose |
|---------|---------|
| `cookie-parser` | Parse `lyra_session` httpOnly cookie server-side |
| `@types/cookie-parser` | TypeScript types |
| `helmet` | Security headers (CSP, HSTS, X-Frame-Options, etc.) |
| `express-rate-limit` | Brute-force and DoS rate limiting |
| `cors` | Origin allowlist enforcement |
| `@types/cors` | TypeScript types |

## Files Added / Changed

| File | Change |
|------|--------|
| `server/index.ts` | Helmet, CORS, cookie-parser, rate limiting, content-type enforcement |
| `server/routes.ts` | httpOnly cookie auth, sessionId removed from responses, IDOR checks, admin SQL auth, auth event logging |
| `server/utils/authLogger.ts` | New — structured JSONL auth event logger |
| `server/utils/emailService.ts` | escapeHtml applied to all email templates |
| `client/src/lib/queryClient.ts` | credentials:include only; all Authorization/localStorage token logic removed |
| `client/src/contexts/AuthContext.tsx` | Added `impersonatedBy` type; removed all localStorage session management |
| `client/src/components/ImpersonationBanner.tsx` | Reads `user.impersonatedBy` from context; calls `/api/admin/stop-impersonating` |
| `client/src/components/ManagedChildBanner.tsx` | Reads `user.impersonatedBy` from context; calls `/api/parent/stop-impersonating` |
| `client/src/components/AdminImpersonatorPanel.tsx` | Uses `user.impersonatedBy` guard; no localStorage writes |
| `client/src/components/DevRoleSwitcher.tsx` | Removed localStorage sessionId write; cookie set server-side |
| `client/src/pages/ParentChildrenPage.tsx` | Removed all localStorage token writes; server handles impersonation |
| `client/src/pages/ClassroomMaterialPage.tsx` | Removed Authorization header; credentials:include only |
| `client/src/pages/Profile.tsx` | Removed Authorization header; credentials:include only |
| `client/src/pages/classroom/NewAssignmentPage.tsx` | Removed Authorization header; credentials:include only |
| `prisma/schema.prisma` | Added `impersonatingUserId Int?` to `AuthSession` model |
| `client/index.html` | Dev banner now only loads in dev preview |
| `package.json` / `package-lock.json` | Vite upgraded to 5.4.21 (CVE-2025-30208) |
| `SECURITY_REPORT.md` | This document |
