---
phase: 19-scheduling-ui
plan: 01
subsystem: ui
tags: [react, scheduling, datetime-local, timezone, forms]

requires:
  - phase: 18-scheduling-backend
    provides: scheduled status, scheduledAt field, status transitions API
provides:
  - PostForm datetime-local scheduling input with UTC conversion
  - CreatePost scheduling handler (status='scheduled' + scheduledAt)
  - EditPost schedule/reschedule/cancel-schedule flows
affects: [19-02-dashboard]

tech-stack:
  added: []
  patterns: [datetime-local to UTC ISO conversion, onSchedule callback prop]

key-files:
  created: []
  modified:
    - client/src/components/PostForm.jsx
    - client/src/pages/CreatePost.jsx
    - client/src/pages/EditPost.jsx

key-decisions:
  - "Native datetime-local input for timezone handling -- zero library overhead, browser handles local display"
  - "Schedule button styled blue to distinguish from Publish (gray) and Save as draft (outline)"
  - "Cancel schedule relabels Save as draft button rather than adding a separate button"

patterns-established:
  - "Local-to-UTC conversion: new Date(localValue).toISOString() for datetime-local inputs"
  - "onSchedule callback pattern mirrors onSubmit/onSaveDraft prop convention"

requirements-completed: [SCHED-01, SCHED-02, SCHED-05, SCHED-06]

duration: 1min
completed: 2026-03-19
---

# Phase 19 Plan 01: Scheduling UI Controls Summary

**PostForm datetime-local scheduling input with Schedule/Reschedule buttons, wired in CreatePost and EditPost for full schedule lifecycle**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-19T21:35:40Z
- **Completed:** 2026-03-19T21:36:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- PostForm extended with datetime-local input and Schedule/Reschedule button
- CreatePost can schedule new posts directly with future publish time
- EditPost supports scheduling drafts, rescheduling scheduled posts, and cancelling schedules (revert to draft)
- All datetime values converted from local timezone to UTC ISO strings before API calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Add scheduling controls to PostForm component** - `03e4afa` (feat)
2. **Task 2: Wire scheduling in CreatePost and EditPost pages** - `fbd58f6` (feat)

## Files Created/Modified
- `client/src/components/PostForm.jsx` - Added datetime-local input, onSchedule/initialScheduledAt props, Schedule/Reschedule button, Cancel schedule relabeling
- `client/src/pages/CreatePost.jsx` - Added handleSchedule handler sending status='scheduled' + scheduledAt, passed onSchedule to PostForm
- `client/src/pages/EditPost.jsx` - Added handleSchedule for reschedule, updated handleSaveDraft for cancel-schedule, heading reflects scheduled status, onSchedule/onSaveDraft shown for appropriate statuses

## Decisions Made
- Used native datetime-local input for timezone handling -- browser displays in local time, `new Date(value).toISOString()` converts to UTC, zero library overhead
- Schedule button styled blue (bg-blue-600) to visually distinguish from Publish and Save as draft
- Reused "Save as draft" button position for "Cancel schedule" rather than adding a separate cancel button

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scheduling UI controls complete, ready for plan 19-02 (dashboard display of scheduled posts)
- All Phase 18 API status transitions correctly wired

---
*Phase: 19-scheduling-ui*
*Completed: 2026-03-19*
