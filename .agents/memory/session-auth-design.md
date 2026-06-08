---
name: Session auth design
description: How session tokens flow between client and server after the httpOnly cookie migration.
---

# Session Auth Design

## Rule
Normal user sessions are carried by the `lyra_session` httpOnly cookie (set by server, never readable by JS). All fetch calls use `credentials: "include"`. The Authorization Bearer header is only used for impersonation overrides.

## Why
Migrated from localStorage token storage (C1 finding in security audit) to eliminate XSS token-theft risk. httpOnly cookies cannot be read by JavaScript.

## How to apply
- `resolveSessionUserId` in `server/routes.ts`: reads `req.cookies.lyra_session` for normal auth. If an `Authorization: Bearer <token>` header is also present, it takes priority (impersonation override).
- `setSessionCookie(res, token)` helper in `server/routes.ts` must be called on every login/signup route.
- Client fetch calls must all include `credentials: "include"` (already set as default in `queryClient.ts`). Do NOT add Authorization headers for normal flows.
- `adminSessionId` and `parentSessionId` in localStorage are set to the string `"1"` (truthy marker), not actual tokens. Only the impersonated user's real token is in localStorage as `"sessionId"`.
- The `AuthContextType.sessionId` field is kept as `null` for interface compatibility but is never populated from localStorage.
