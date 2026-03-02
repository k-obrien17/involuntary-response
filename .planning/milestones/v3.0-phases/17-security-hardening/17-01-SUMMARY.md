---
phase: 17-security-hardening
plan: 01
subsystem: api
tags: [helmet, csp, security-headers, jwt, csrf, express-middleware]

# Dependency graph
requires:
  - phase: 15-deployment-wiring
    provides: Express server configuration and middleware chain
provides:
  - Security headers middleware (CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
  - Origin validation middleware for state-changing requests
  - 30-day JWT token expiry (reduced from 365 days)
affects: [18-performance, 19-launch-prep]

# Tech tracking
tech-stack:
  added: [helmet@8.1.0]
  patterns: [security-middleware-chain, defense-in-depth-csrf, manual-header-for-deprecated-helmet-features]

key-files:
  created: [server/middleware/security.js]
  modified: [server/index.js, server/middleware/auth.js, server/package.json]

key-decisions:
  - "Helmet v8 removed xXssProtection -- manually set X-XSS-Protection: 1; mode=block"
  - "JWT expiry 30d (not 7d) -- balances security with user convenience, no refresh token needed"
  - "Origin validation allows missing Origin header (server-to-server, curl compatible)"

patterns-established:
  - "Security middleware ordering: securityHeaders before CORS, validateOrigin after CORS but before routes"
  - "Defense-in-depth: origin validation supplements JWT-in-Authorization-header CSRF resistance"

requirements-completed: [SEC-01, SEC-02, SEC-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 17 Plan 01: Security Hardening Summary

**Helmet-based security headers with CSP for 6 embed providers, origin validation on state-changing endpoints, and JWT expiry reduced to 30 days**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T01:01:52Z
- **Completed:** 2026-03-02T01:03:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Every API response now includes Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and X-XSS-Protection: 1; mode=block
- CSP frame-src allows all 6 embed providers (Spotify, YouTube, Vimeo, SoundCloud, Bandcamp, Apple Music)
- POST/PUT/PATCH/DELETE requests from unexpected origins are rejected with 403
- New JWT tokens expire in 30 days instead of 365, while existing sessions continue working

## Task Commits

Each task was committed atomically:

1. **Task 1: Install helmet and add security headers middleware with CSP** - `2c54dd8` (feat)
2. **Task 2: Reduce JWT expiry from 365 days to 30 days** - `77516eb` (fix)

## Files Created/Modified
- `server/middleware/security.js` - Security headers via helmet + manual X-XSS-Protection, origin validation middleware
- `server/index.js` - Import and register securityHeaders (before CORS) and validateOrigin (after CORS)
- `server/middleware/auth.js` - Changed generateToken expiresIn from '365d' to '30d'
- `server/package.json` - Added helmet@8.1.0 dependency

## Decisions Made
- **Helmet v8 xXssProtection handling:** Helmet v8 removed the xXssProtection middleware. Manually set `X-XSS-Protection: 1; mode=block` header in the securityHeaders middleware wrapper to meet the requirement that all 4 headers are present.
- **JWT expiry at 30 days:** Plan specified 30d. No refresh token logic added (explicitly out of scope). Existing 365-day tokens are unaffected -- jwt.verify honors the encoded exp claim.
- **Origin validation permissiveness:** Requests with no Origin header are allowed through (supports server-to-server calls, curl, mobile apps). Only requests with a mismatched Origin are rejected.

## Deviations from Plan

None - plan executed exactly as written. The helmet v8 xXssProtection behavior was anticipated in the plan's IMPORTANT note.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Security headers active on all responses, ready for production
- JWT expiry hardened, no user-facing changes needed
- Origin validation provides additional CSRF defense layer

## Self-Check: PASSED

All files exist, all commits verified, all key patterns confirmed in source.

---
*Phase: 17-security-hardening*
*Completed: 2026-03-02*
