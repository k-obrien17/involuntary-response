---
phase: 11-reader-accounts
plan: 01
subsystem: auth
tags: [jwt, bcrypt, express, role-based-access, rate-limiting]

# Dependency graph
requires:
  - phase: 10-schema-query-safety
    provides: "status filter on all queries, published_at field"
provides:
  - "POST /api/auth/register-reader endpoint for open reader signup"
  - "requireContributor middleware applied to all 5 mutation endpoints"
  - "Role-based route protection pattern (authenticateToken -> requireContributor -> rateLimiter)"
affects: [11-reader-accounts, 12-post-likes, 13-post-comments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireContributor middleware chain for contributor-only routes"
    - "Separate rate limiter for public-facing registration (5/15min vs 20/15min)"

key-files:
  created: []
  modified:
    - server/routes/auth.js
    - server/routes/posts.js
    - server/routes/embeds.js
    - server/routes/profile.js

key-decisions:
  - "Separate /register-reader endpoint (not modifying existing /register) to preserve invite-only contributor flow"
  - "Stricter rate limit for reader registration (5/15min) since endpoint is publicly accessible"
  - "requireContributor placed after authenticateToken but before rateLimiter in middleware chain"

patterns-established:
  - "Role-based middleware: authenticateToken -> requireContributor -> rateLimiter -> handler"
  - "Public registration endpoints use stricter rate limiting than auth-gated ones"

requirements-completed: [ACCT-01, ACCT-02]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 11 Plan 01: Reader Registration & Route Protection Summary

**Open reader registration endpoint with role-based middleware protecting all 5 contributor mutation routes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T04:48:14Z
- **Completed:** 2026-03-01T04:49:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Reader registration endpoint at POST /api/auth/register-reader with email, password, displayName (no invite token)
- requireContributor middleware applied to all 5 mutation endpoints across 3 route files
- Existing contributor invite registration and login flows completely unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add reader registration endpoint** - `d9dcff0` (feat)
2. **Task 2: Apply requireContributor to mutation routes** - `a98f02c` (feat)

## Files Created/Modified
- `server/routes/auth.js` - Added POST /register-reader endpoint with dedicated rate limiter (5/15min)
- `server/routes/posts.js` - Added requireContributor to POST, PUT, DELETE routes
- `server/routes/embeds.js` - Added requireContributor to POST /resolve
- `server/routes/profile.js` - Added requireContributor to PUT /me

## Decisions Made
- Used separate /register-reader endpoint rather than modifying /register -- preserves the existing invite-only flow exactly as-is
- Stricter rate limit (5 per 15 minutes) for reader registration since it is publicly accessible without invite token
- requireContributor positioned after authenticateToken (needs req.user.role) but before rateLimiter (no point rate-limiting rejected requests)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Reader registration API is live, ready for frontend signup form (plan 11-02)
- All mutation routes protected -- readers get 403 on contributor actions
- Login endpoint already works for all roles without modification
- Post likes and comments phases can proceed (readers can authenticate)

## Self-Check: PASSED

All 4 modified files verified on disk. Both task commits (d9dcff0, a98f02c) verified in git log.

---
*Phase: 11-reader-accounts*
*Completed: 2026-03-01*
