---
phase: 18-scheduling-backend
plan: 01
subsystem: api
tags: [scheduling, posts, sqlite, migration]

requires:
  - phase: 17-editorial-posts
    provides: posts table with status/published_at columns
provides:
  - scheduled_at column on posts table
  - scheduled status support in create/update API
  - scheduling validation (future-only, required scheduledAt)
affects: [18-02, scheduling-frontend, auto-publisher]

tech-stack:
  added: []
  patterns: [status-transition-validation, scheduled-post-lifecycle]

key-files:
  created: []
  modified:
    - server/db/index.js
    - server/routes/posts.js

key-decisions:
  - "No index on scheduled_at -- auto-publisher scans tiny result set of scheduled posts"
  - "scheduled->published transition clears scheduled_at and sets published_at to CURRENT_TIMESTAMP"
  - "published->scheduled rejected with 400 -- once published, cannot reschedule"

patterns-established:
  - "Status transition validation: explicit allow-list of valid status changes with per-transition SQL"

requirements-completed: [SCHED-03, SCHED-08]

duration: 2min
completed: 2026-03-19
---

# Phase 18 Plan 01: Scheduling Data Model & API Summary

**Migration adds scheduled_at column to posts, with full scheduling lifecycle in create/update endpoints**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T21:15:43Z
- **Completed:** 2026-03-19T21:17:22Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Migration 6 adds scheduled_at DATETIME column to posts table
- POST / accepts 'scheduled' status with required future scheduledAt, validates and rejects past times
- PUT /:slug supports all scheduling transitions: draft->scheduled, scheduled->draft, scheduled->published, scheduled->scheduled
- GET /mine and GET /:slug return scheduledAt field for authors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add scheduled_at migration and extend create/update API for scheduling** - `35bb9f2` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `server/db/index.js` - Migration 6 adding scheduled_at DATETIME column
- `server/routes/posts.js` - Scheduled status in POST /, PUT /:slug with full transition validation, GET /mine and GET /:slug return scheduledAt

## Decisions Made
- No index on scheduled_at -- the auto-publisher query scans a tiny result set (few scheduled posts at any time)
- published->scheduled rejected -- once a post is published, it cannot be rescheduled
- scheduled->published clears scheduled_at and sets published_at to CURRENT_TIMESTAMP

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- scheduled_at column and API validation ready for plan 18-02 (auto-publisher polling mechanism)
- All public endpoints already filter WHERE status = 'published', so scheduled posts are automatically excluded

---
*Phase: 18-scheduling-backend*
*Completed: 2026-03-19*
