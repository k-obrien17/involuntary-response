---
phase: 16-social-sharing
plan: 01
subsystem: infra
tags: [og-meta, vercel, serverless, social-sharing, seo]

# Dependency graph
requires:
  - phase: 15-deployment-wiring
    provides: "Vercel configuration and deployment wiring"
provides:
  - "Dynamic OG meta tags for post permalinks (title, description, image)"
  - "Default OG meta tags for all non-post pages"
  - "Crawler-aware Vercel rewrite routing via user-agent detection"
affects: [17-performance, 18-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Vercel conditional rewrites with user-agent header matching", "Serverless OG function handling all routes with path-based branching"]

key-files:
  created: []
  modified:
    - client/api/og.js
    - client/vercel.json
    - client/index.html

key-decisions:
  - "Crawler UA rewrite placed first in vercel.json; /posts/:slug kept as fallback for crawlers not in UA list"
  - "og:type uses __OG_TYPE__ placeholder replaced by serverless function (article for posts, website for others)"
  - "og:site_name hardcoded in index.html (never changes per-page, no placeholder needed)"

patterns-established:
  - "Vercel conditional rewrites: use 'has' with 'header' type for UA-based routing"
  - "OG function route branching: parse req.url path, match against known patterns, fall back to site defaults"

requirements-completed: [SHARE-01, SHARE-02]

# Metrics
duration: 1min
completed: 2026-03-02
---

# Phase 16 Plan 01: Social Sharing OG Tags Summary

**Dynamic OG meta tags via Vercel serverless function with crawler-aware UA routing for all pages**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-02T00:30:57Z
- **Completed:** 2026-03-02T00:32:07Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Expanded OG serverless function from post-only to all-route handling with path-based branching
- Added Vercel conditional rewrite routing crawler user-agents through OG function for all non-API paths
- Updated index.html with og:type placeholder and og:site_name meta tag

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand OG serverless function to handle all routes with crawler-aware routing** - `0350a5a` (feat)
2. **Task 2: Update index.html with real default OG values and og:type placeholder** - `cf68f4a` (feat)

## Files Created/Modified
- `client/api/og.js` - Serverless OG function now handles all routes (dynamic for posts, defaults for others), replaces __OG_TYPE__ placeholder
- `client/vercel.json` - Added crawler UA conditional rewrite as first rule, kept post fallback and API proxy
- `client/index.html` - Replaced hardcoded og:type "article" with __OG_TYPE__ placeholder, added og:site_name

## Decisions Made
- Crawler UA rewrite is placed first in vercel.json rewrites array; the existing /posts/:slug rule stays as a fallback to ensure post pages always go through OG function even if a crawler UA is not in the detection list
- og:type uses a placeholder (__OG_TYPE__) for consistency with other OG tags, replaced by serverless function with "article" for posts and "website" for everything else
- og:site_name is hardcoded directly in index.html rather than using a placeholder since it never varies per-page

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Social sharing OG tags are fully wired for all routes
- Post permalinks will unfurl with dynamic title, body snippet, and album art on Twitter/Slack/iMessage
- Non-post pages show default site branding
- Ready for performance optimization or testing phases

---
*Phase: 16-social-sharing*
*Completed: 2026-03-02*

## Self-Check: PASSED

All files exist, all commits verified.
