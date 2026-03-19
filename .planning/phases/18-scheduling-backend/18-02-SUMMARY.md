---
phase: 18-scheduling-backend
plan: 02
subsystem: api
tags: [scheduler, setInterval, auto-publish, cron]

requires:
  - phase: 18-01
    provides: "scheduled_at column on posts table, schedule/cancel API endpoints"
provides:
  - "startScheduler() auto-publish loop that polls every 2 minutes"
  - "Automatic publishing of due scheduled posts"
affects: [19-scheduling-frontend]

tech-stack:
  added: []
  patterns: ["setInterval polling for background tasks", "per-item error isolation in batch operations"]

key-files:
  created: [server/lib/scheduler.js]
  modified: [server/index.js]

key-decisions:
  - "setInterval over node-cron -- no new dependency, simplest for the stack"
  - "Immediate run on startup catches posts due while server was down"

patterns-established:
  - "Background scheduler pattern: module in server/lib/, started after initDatabase() in index.js"
  - "Per-item try/catch in batch DB operations to prevent one failure from blocking others"

requirements-completed: [SCHED-04]

duration: 1min
completed: 2026-03-19
---

# Phase 18 Plan 02: Auto-Publish Scheduler Summary

**setInterval-based scheduler polling every 2 minutes to auto-publish due scheduled posts with per-post error isolation**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-19T21:19:25Z
- **Completed:** 2026-03-19T21:20:14Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created scheduler module that polls every 2 minutes for due scheduled posts
- Auto-publishes posts where scheduled_at <= now, setting published_at and clearing scheduled_at
- Immediate startup run catches any posts that were due while server was down
- Integrated into server startup after database initialization

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scheduler module and integrate into server startup** - `94de1a8` (feat)

## Files Created/Modified
- `server/lib/scheduler.js` - Scheduler module with startScheduler() and publishDuePosts()
- `server/index.js` - Import and call startScheduler() after initDatabase()

## Decisions Made
- Used setInterval over node-cron: simplest approach for the stack, no new dependency needed
- 2-minute polling interval: within the "few minutes" precision requirement from REQUIREMENTS.md
- Immediate run on startup: handles server-was-down scenario by publishing overdue posts right away
- Per-post try/catch: one failed publish does not block processing of remaining posts
- Outer try/catch: query failures do not kill the interval loop

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scheduler backend complete, ready for Phase 19 (scheduling frontend UI)
- Posts with status='scheduled' and scheduled_at in the past will auto-publish within 2 minutes
- Phase 18 (both plans) fully complete: data model, API endpoints, and auto-publish scheduler

---
*Phase: 18-scheduling-backend*
*Completed: 2026-03-19*
