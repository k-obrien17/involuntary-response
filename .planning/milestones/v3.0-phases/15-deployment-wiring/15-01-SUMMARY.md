---
phase: 15-deployment-wiring
plan: 01
subsystem: infra
tags: [env-validation, smtp, startup, express]

# Dependency graph
requires: []
provides:
  - Server startup env validation (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME)
  - SMTP availability check (isEmailConfigured) for route consumption
  - Password reset 503 when email not configured
affects: [16-security-hardening, 17-vercel-render-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns: [fail-fast env validation, graceful degradation for optional services]

key-files:
  created: []
  modified:
    - server/index.js
    - server/db/index.js
    - server/lib/email.js
    - server/routes/auth.js

key-decisions:
  - "Admin env vars required at startup (fail-fast) rather than silent skip at seed time"
  - "SMTP missing is a warning (non-fatal) since it only affects password reset"
  - "503 status for password reset when SMTP unavailable -- generic message hides config details"

patterns-established:
  - "Env validation: validateEnv() runs before initDatabase() in server/index.js"
  - "Service availability: export isXConfigured() functions from service modules for route-level checks"

requirements-completed: [DEPLOY-02, DEPLOY-03]

# Metrics
duration: 1min
completed: 2026-03-01
---

# Phase 15 Plan 01: Env Validation Summary

**Fail-fast server startup validation for admin env vars and graceful 503 on password reset when SMTP is unconfigured**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-01T20:15:23Z
- **Completed:** 2026-03-01T20:16:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Server refuses to start with actionable error when ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_DISPLAY_NAME is missing
- Startup logs a clear warning when SMTP_HOST is not configured (non-fatal)
- POST /api/auth/forgot-password returns 503 with generic user-facing error when SMTP is unavailable
- Removed redundant guard in seedAdmin() since validation now happens earlier at startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Add admin env var validation to server startup** - `031a742` (feat)
2. **Task 2: Make password reset endpoint return error when SMTP unavailable** - `171b5b7` (feat)

## Files Created/Modified
- `server/index.js` - Added validateEnv() function with required admin var checks and SMTP warning
- `server/db/index.js` - Removed redundant early-return guard in seedAdmin()
- `server/lib/email.js` - Exported isEmailConfigured() function
- `server/routes/auth.js` - Added 503 early return in forgot-password when SMTP unavailable

## Decisions Made
- Admin env vars are validated at startup (fail-fast) rather than silently skipping at seed time -- production deploys should fail immediately with actionable errors
- SMTP missing is a warning only (non-fatal) since the server is fully functional without password reset
- 503 status chosen for password reset unavailability with a generic message that does not reveal infrastructure details

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Env validation pattern established for future phases to extend with additional required vars
- isEmailConfigured pattern can be reused for other service-dependent endpoints
- Ready for Phase 15 Plan 02

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 15-deployment-wiring*
*Completed: 2026-03-01*
