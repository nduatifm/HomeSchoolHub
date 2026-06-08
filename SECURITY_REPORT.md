# Lyra Preparatory — Security Audit Report

**Date:** 2026-06-08  
**Scope:** Full-stack security audit of the Lyra Preparatory tutoring platform.  
**Outcome:** All critical and high-severity findings remediated. Medium and low findings addressed where feasible.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Fixed |
| High | 5 | Fixed (2 were false positives — already protected) |
| Medium | 4 | Fixed |
| Low | 2 | Fixed / Documented |

---

## Critical Findings

### C1 — Session Tokens Stored in localStorage (XSS Token Theft) — FIXED

**Before:** Every auth flow stored the session token in `localStorage.setItem("sessionId", ...)`. All fetch calls read it via `localStorage.getItem("sessionId")` and sent it as `Authorization: Bearer <token>`. Any XSS vulnerability could silently exfiltrate the token.

**After:**
- Server sets a `lyra_session` **httpOnly cookie** after every successful login/signup. httpOnly cookies are never accessible to JavaScript — XSS cannot read them.
- `client/src/lib/queryClient.ts` now uses `credentials: "include"` on all requests so the browser automatically attaches the cookie.
- `client/src/contexts/AuthContext.tsx` no longer reads or writes `sessionId` to `localStorage`.
- **Impersonation compatibility preserved:** The admin "become user" and parent "view as child" flows still store the *impersonated* session token in `localStorage` and send it as an `Authorization: Bearer` header. The server reads the `Authorization` header first (higher priority), then falls back to the cookie — so the base admin/parent session remains in the secure cookie while the short-lived impersonated token lives only in localStorage (admin-only risk surface).
- `server/routes.ts`: `resolveSessionUserId` now reads cookie first for normal auth, Authorization header for impersonation override.

**Files changed:** `server/routes.ts`, `server/index.ts`, `client/src/contexts/AuthContext.tsx`, `client/src/lib/queryClient.ts`, `client/src/components/AdminImpersonatorPanel.tsx`, `client/src/components/ImpersonationBanner.tsx`, `client/src/components/ManagedChildBanner.tsx`, `client/src/pages/ParentChildrenPage.tsx`, `client/src/pages/ClassroomMaterialPage.tsx`, `client/src/pages/Profile.tsx`

---

## High Findings

### H1 — No Rate Limiting — FIXED

**Before:** No rate limiting on any endpoint. Brute-force attacks against `/api/auth/login` were unrestricted.

**After:** `express-rate-limit` added in `server/index.ts`:
- **Auth routes** (`/api/auth/*`): 30 requests per 15 minutes per IP.
- **All API routes** (`/api/*`): 300 requests per minute per IP.
- Rate limiting only enforced in production (`NODE_ENV=production`) to avoid blocking developers.

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

`GET /api/students/:studentId/classroom-notifications` already verified that the caller is the student owner, a team parent member, the assigned teacher, or an admin. No changes needed.

### H6 — Team Member PATCH/DELETE Cross-Child Tampering — ALREADY PROTECTED (False Positive)

Both `PATCH /api/students/:studentId/team/:memberId` and `DELETE /api/students/:studentId/team/:memberId` already scoped the `childTeamMember` lookup with `{ id: memberId, childId: studentId }`, preventing cross-child tampering. No changes needed.

### H7 — Admin SQL Endpoint Missing Auth Middleware — FIXED (Critical Severity)

**Before:** `POST /api/admin/sql` had **no authentication middleware** — any unauthenticated caller could execute arbitrary SQL queries against the production database.

**After:**
- Added `requireSuperAdmin` middleware (was entirely absent).
- Restricted allowed SQL to `SELECT`, `WITH`, and `EXPLAIN` statements only — all DML/DDL is rejected with HTTP 403.
- Removed the `$executeRawUnsafe` code path entirely.

---

## Medium Findings

### M1 — HTML Injection in Email Templates — FIXED

**Before:** User-controlled values (`name`, `studentName`, `parentName`, `title`, `body`) were interpolated directly into HTML email templates without escaping.

**After:** Added `escapeHtml()` helper in `server/utils/emailService.ts` that encodes `& < > " '`. Applied to all user-derived values in all five email functions.

### M2 — Replit Dev Banner Loaded Unconditionally — FIXED

**Before:** `client/index.html` loaded `https://replit.com/public/js/replit-dev-banner.js` unconditionally (including production builds), with no SRI hash.

**After:** Replaced with an inline guard script that only loads the banner when the hostname is not `localhost`, `.replit.app`, `.replit.dev`, or `www.lyraprep.com` — i.e., only in Replit's web preview environment during active development.

### M3 — Admin SQL DML Allowlist — FIXED (combined with H7 above)

The DML keyword blocklist and auth middleware fix were applied together with H7.

### M4 — No CORS Policy — FIXED

**Before:** No CORS middleware. Browsers could be tricked into making credentialed cross-origin requests.

**After:** `cors` middleware installed with explicit origin allowlist (see H2 above).

---

## Low Findings

### L1 — bcrypt Cost Factor Too Low — FIXED

**Before:** `bcrypt.hash(password, 10)` — adequate but below current recommendations.

**After:** `bcrypt.hash(password, 12)` — approximately 4x more compute per hash, materially harder to brute-force offline.

### L2 — Vite CVE-2025-30208 (Path Traversal) — MANUAL ACTION REQUIRED

The project uses `vite ^5.4.14` which is vulnerable to CVE-2025-30208 (path traversal via `@fs` URLs). The patched version is `5.4.15+`.

**Action required:** A project owner must run the following and redeploy:
```
npm install vite@latest
```
This cannot be done automatically as `package.json` edits are gated by development policy.

---

## Residual Risk

1. **Impersonation session tokens** (admin "become user", parent "view as child"): The short-lived impersonation tokens still pass through `localStorage`. These are only accessible to super-admins and parents respectively. A full mitigation would use server-side session chaining (tracking `impersonatingUserId` in the `AuthSession` table) — out of scope for this audit cycle.

2. **Admin SQL audit logging**: Even with the SELECT-only restriction, raw SQL access to production data is a significant privilege. Consider adding an `admin_sql_log` table that records the query, timestamp, and caller for every execution.

3. **Content-Security-Policy `'unsafe-inline'` for scripts**: Required by the current React/Vite build (no nonce/hash injection). A future improvement is to adopt a nonce-based CSP via the Vite build pipeline.

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
