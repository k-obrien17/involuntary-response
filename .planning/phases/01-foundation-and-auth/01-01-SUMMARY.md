---
phase: 01-foundation-and-auth
plan: 01
subsystem: auth
tags: [express, turso, jwt, bcrypt, nodemailer, invite-system, role-based-auth]

# Dependency graph
requires: []
provides:
  - Turso database schema (users with roles, invite_tokens, password_reset_tokens)
  - JWT auth middleware with is_active DB check and role in payload
  - Admin role-check middleware (requireAdmin)
  - Auth routes (register with invite, login, forgot-password, reset-password)
  - Nodemailer email lib with graceful SMTP fallback
  - Admin seed on first startup from env vars
affects: [01-02, 01-03, 02-post-creation, all-future-plans]

# Tech tracking
tech-stack:
  added: [nodemailer@8.0.1]
  removed: [google-auth-library]
  patterns: [invite-gated-registration, role-based-middleware, is_active-db-check, username-auto-generation, atomic-invite-consumption]

key-files:
  created:
    - server/middleware/admin.js
    - server/lib/email.js
  modified:
    - server/package.json
    - server/db/index.js
    - server/middleware/auth.js
    - server/routes/auth.js
    - server/index.js
    - server/.env.example

key-decisions:
  - "365-day JWT expiry with role+username+email in payload (per user decision: sessions persist until logout)"
  - "is_active DB check on every authenticated request in authenticateToken middleware (prevents deactivated users from accessing anything)"
  - "Atomic invite consumption via UPDATE WHERE used_by IS NULL with changes check (prevents race condition on simultaneous registrations)"
  - "Username auto-generated from display name with collision avoidance (append -1, -2, etc.)"
  - "SMTP graceful fallback: if SMTP_HOST not configured, reset emails logged to console (allows dev without email)"

patterns-established:
  - "Invite-gated registration: validate token existence, 7-day JS expiry check, atomic consumption"
  - "Role-based middleware chain: authenticateToken -> requireAdmin"
  - "Email enumeration prevention: forgot-password always returns 200 regardless of email existence"
  - "Admin seed pattern: check if any admin exists, seed from env vars on first run only"

requirements-completed: [AUTH-02, AUTH-03, AUTH-04, PROF-01]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 1 Plan 1: Server Foundation Summary

**Express 5 API with Turso schema (users/invites/resets), JWT auth with role-based is_active middleware, invite-gated registration, and nodemailer password reset flow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T05:13:06Z
- **Completed:** 2026-02-27T05:15:47Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Fresh Turso database schema with users (roles, is_active), invite_tokens, and password_reset_tokens tables
- JWT auth middleware that checks is_active in DB on every authenticated request, with role in payload
- Four auth endpoints: invite-gated register, login, forgot-password (no email enumeration), reset-password
- Admin seed from environment variables on first startup
- Nodemailer email setup with graceful fallback when SMTP not configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Server scaffolding** - `1b802e3` (feat) - package.json, Turso schema, auth middleware, admin middleware, email lib, .env.example
2. **Task 2: Express app and auth routes** - `12562c3` (feat) - index.js, register/login/forgot-password/reset-password routes

## Files Created/Modified
- `server/package.json` - Renamed to involuntary-response-server, added nodemailer, removed google-auth-library
- `server/db/index.js` - New Turso schema (users, invite_tokens, password_reset_tokens), seedAdmin function
- `server/middleware/auth.js` - JWT auth with is_active DB check, generateToken with role/365d
- `server/middleware/admin.js` - requireAdmin role-check middleware (new file)
- `server/lib/email.js` - Nodemailer transporter with SMTP graceful fallback (new file)
- `server/index.js` - Clean Express app mounting only /api/auth, health check, error handler
- `server/routes/auth.js` - Register (invite-gated), login, forgot-password, reset-password
- `server/.env.example` - All new env vars for Involuntary Response

## Decisions Made
- 365-day JWT expiry with role in payload (user decision: persist until logout)
- is_active check in authenticateToken on every request (prevents deactivated user access at small-community scale)
- Atomic invite consumption using UPDATE WHERE clause + changes check (race condition protection per research pitfall #3)
- Username auto-generated from display name, collision-avoidance via suffix (-1, -2, etc.)
- SMTP graceful fallback: log reset URL to console when SMTP_HOST not configured

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Server self-bootstraps from environment variables.

## Next Phase Readiness
- Server foundation complete with working auth endpoints and database schema
- Ready for Plan 01-02: Client foundation (React shell, AuthContext, API client, auth pages)
- Ready for Plan 01-03: Admin dashboard (invite CRUD, contributor management)
- Old Backyard Marquee route files still exist but are not mounted (can be cleaned up in a future task)

## Self-Check: PASSED

All 8 created/modified files verified on disk. Both task commits (1b802e3, 12562c3) verified in git log.

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-02-27*
