---
phase: 14-drafts-post-editing
plan: 01
subsystem: api
tags: [express, draft, status, publishing, sqlite]

# Dependency graph
requires:
  - phase: 10-schema-query-safety
    provides: "posts.status column, published_at column, status='published' filters"
provides:
  - "Draft-aware POST /posts with conditional published_at"
  - "Publish transition on PUT /posts/:slug (draft -> published)"
  - "Unpublish rejection (400) on published posts"
  - "GET /posts/mine endpoint for contributor post inventory"
  - "posts.listMine() API client method"
affects: [14-02-PLAN, draft-ui, editorial-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: ["status-aware create with conditional published_at", "publish transition detection on update", "safety backfill for NULL published_at"]

key-files:
  created: []
  modified: ["server/routes/posts.js", "client/src/api/client.js"]

key-decisions:
  - "Default status is 'published' when not specified (backward compatible)"
  - "One-time safety backfill runs on next create to fix pre-existing NULL published_at"
  - "GET /mine registered before GET /:slug to avoid Express param collision"
  - "Unpublish rejected with 400 (no revert from published to draft)"

patterns-established:
  - "Status transition detection: compare post.status with newStatus to detect publish"
  - "Conditional SQL generation: template literal for CURRENT_TIMESTAMP vs NULL in INSERT"

requirements-completed: [EDIT-01, EDIT-03, EDIT-04]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 14 Plan 01: Drafts & Post Editing -- API Endpoints Summary

**Draft-aware create/update endpoints with publish transition, unpublish rejection, and contributor-only /mine listing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T16:21:14Z
- **Completed:** 2026-03-01T16:23:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- POST /posts accepts status:'draft' (NULL published_at) or 'published' (CURRENT_TIMESTAMP), fixing existing bug where published posts had NULL published_at
- PUT /posts/:slug detects draft-to-published transition, sets published_at on publish, rejects unpublish with 400
- GET /posts/mine returns all posts (draft + published) for authenticated contributor with consistent response shape
- posts.listMine() added to API client for frontend consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft-aware POST and publish-transition PUT** - `677fc1d` (feat)
2. **Task 2: GET /mine endpoint and API client method** - `d593f00` (feat)

## Files Created/Modified
- `server/routes/posts.js` - Draft-aware create, publish transition on update, unpublish rejection, /mine endpoint
- `client/src/api/client.js` - Added posts.listMine() method

## Decisions Made
- Default status is 'published' when not specified -- maintains backward compatibility with existing create calls
- One-time safety backfill on next POST fixes any published posts that were created between Phase 10 (which added the status column) and now with NULL published_at
- GET /mine registered before GET /:slug in Express router to prevent "mine" from being captured as a slug parameter
- Unpublish rejected with 400 error -- once published, posts cannot revert to draft status

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- API foundation for drafts is complete -- ready for 14-02 (Draft Management UI)
- posts.listMine() available for the My Posts page component
- Publish transition available for the draft-to-published workflow button

## Self-Check: PASSED

All files verified present. All commit hashes verified in git log.

---
*Phase: 14-drafts-post-editing*
*Completed: 2026-03-01*
