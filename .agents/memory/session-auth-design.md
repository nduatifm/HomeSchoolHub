---
name: Server-side impersonation design
description: How auth sessions and impersonation work — cookie-only, no localStorage tokens.
---

# Session Auth Design

## Rule
All session auth uses a single `lyra_session` httpOnly cookie. No Authorization header, no localStorage token, ever.

**Why:** The previous design stored impersonation tokens in localStorage and sent them as `Authorization: Bearer`, making them XSS-stealable. Full server-side impersonation closes this gap.

## How to apply
- `resolveSessionUserId` reads ONLY `req.cookies.lyra_session` — do not add Authorization header support back.
- `AuthSession.impersonatingUserId Int?` — when set, requests run as that user; the original user is `realUserId`.
- `req.session.userId` = effective identity (impersonated or real). `req.session.realUserId` = cookie holder. `req.session.sessionId` = raw session token.
- `requireAdmin` / `requireSuperAdmin` check `realUserId` (not `userId`) so admin privileges survive impersonation.
- `POST /api/admin/become` and `POST /api/parent/become-child` update `AuthSession.impersonatingUserId` in place — they do not create new sessions.
- `POST /api/admin/stop-impersonating` and `POST /api/parent/stop-impersonating` set `impersonatingUserId = null`.
- `GET /api/auth/me` returns `impersonatedBy: { id, name, role, isAdmin, isSuperAdmin } | null`. Client banners read this field, never localStorage.
- `POST /api/dev/become` creates a new session AND calls `setSessionCookie()` — no sessionId in response body.
- `POST /api/auth/logout` reads only the cookie (not Authorization header) to find and delete the session.
- `change-password` uses `req.session.sessionId` (not Authorization header) to identify the current session to preserve.
