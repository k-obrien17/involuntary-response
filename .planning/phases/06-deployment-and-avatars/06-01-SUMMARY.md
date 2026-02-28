---
phase: 06-deployment-and-avatars
plan: 01
subsystem: infra
tags: [vercel, deployment, proxy, rewrite]

# Dependency graph
requires: []
provides:
  - "Vercel API proxy rewrite forwarding /api/* to Render backend"
affects: [07-artist-data, 08-inline-references, 09-search]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Vercel rewrite rules for API proxying to external backend"]

key-files:
  created: []
  modified: ["client/vercel.json"]

key-decisions:
  - "Hardcoded placeholder URL (RENDER_BACKEND_URL) instead of env var syntax -- Vercel Hobby plan does not support $ENV in rewrite destinations"
  - "Placed API rewrite between OG tag handler and SPA catch-all -- Vercel evaluates rewrites top-to-bottom, first match wins"

patterns-established:
  - "Rewrite order in vercel.json: specific routes first, API proxy second, SPA catch-all last"

requirements-completed: [DEPL-01]

# Metrics
duration: 1min
completed: 2026-02-28
---

# Phase 6 Plan 01: Vercel API Proxy Summary

**Vercel rewrite rule proxying /api/* requests to Render backend for production API connectivity**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-28T14:34:45Z
- **Completed:** 2026-02-28T14:35:21Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `/api/:path*` rewrite rule to `client/vercel.json` pointing to Render backend
- Preserved existing OG tag rewrite and SPA catch-all in correct evaluation order
- Used clearly-marked placeholder URL (`RENDER_BACKEND_URL`) for user to replace with actual Render service URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Add API proxy rewrite to vercel.json** - `6383d74` (feat)

## Files Created/Modified
- `client/vercel.json` - Added `/api/:path*` rewrite rule between OG tag handler and SPA catch-all

## Decisions Made
- Used hardcoded placeholder URL rather than `$ENV_VAR` syntax because Vercel Hobby plans do not support environment variable interpolation in rewrite destinations
- Maintained rewrite ordering: `/posts/:slug` (OG tags) > `/api/:path*` (API proxy) > `/(.*)`  (SPA catch-all), since Vercel evaluates top-to-bottom with first-match semantics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

The user must replace `RENDER_BACKEND_URL` in `client/vercel.json` with their actual Render service URL (e.g., `https://backyard-marquee-api.onrender.com`). This is documented in the placeholder itself.

## Next Phase Readiness
- Vercel deployment configuration is ready for production once placeholder URL is replaced
- All v2.0 features requiring API calls will work through this proxy once deployed
- No blockers for Phase 6 Plan 02 (avatars) or subsequent phases

## Self-Check: PASSED

- [x] `client/vercel.json` exists
- [x] `06-01-SUMMARY.md` exists
- [x] Commit `6383d74` exists

---
*Phase: 06-deployment-and-avatars*
*Completed: 2026-02-28*
