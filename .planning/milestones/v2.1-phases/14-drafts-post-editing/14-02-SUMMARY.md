---
phase: 14-drafts-post-editing
plan: 02
subsystem: ui
tags: [react, tailwind, drafts, editorial-workflow, post-editing]

# Dependency graph
requires:
  - phase: 14-drafts-post-editing/01
    provides: "Draft API endpoints (status field, GET /mine, publish transition)"
provides:
  - "PostForm dual-action buttons (Save as draft / Publish)"
  - "MyPosts page with drafts-first contributor inventory"
  - "Draft preview with Publish button on ViewPost"
  - "Edited indicator on published posts (ViewPost + PostCard)"
  - "EditPost draft-aware heading and dual buttons"
  - "Navbar My Posts link for contributors"
  - "/my-posts route with ContributorRoute guard"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-action form buttons via optional callback prop (onSaveDraft)"
    - "Conditional UI based on post.status (draft vs published)"
    - "Edited detection via updatedAt > publishedAt comparison"

key-files:
  created:
    - "client/src/pages/MyPosts.jsx"
  modified:
    - "client/src/components/PostForm.jsx"
    - "client/src/pages/CreatePost.jsx"
    - "client/src/pages/EditPost.jsx"
    - "client/src/pages/ViewPost.jsx"
    - "client/src/components/PostCard.jsx"
    - "client/src/components/Navbar.jsx"
    - "client/src/App.jsx"

key-decisions:
  - "PostForm uses optional onSaveDraft callback to toggle between dual-button and single-button modes"
  - "MyPosts uses simple filter+section approach rather than tabs for draft/published grouping"
  - "ViewPost Publish uses window.location.reload() after navigate to force fresh state"
  - "PostCard shows 'edited' with middot separator (no parentheses) for feed density"

patterns-established:
  - "Optional callback prop pattern for conditional form actions"
  - "updatedAt > publishedAt as canonical edited-post detection"

requirements-completed: [EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 14 Plan 02: Contributor Editorial UI Summary

**Dual Publish/Draft buttons in PostForm, MyPosts inventory page, draft preview with Publish action, and (edited) indicator on published posts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T16:25:36Z
- **Completed:** 2026-03-01T16:28:15Z
- **Tasks:** 3
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments
- PostForm shows dual "Save as draft" / "Publish" buttons in create mode, and "Save draft" / "Publish" for draft edits
- MyPosts page groups contributor's drafts and published posts with status badges, dates, and (edited) indicators
- ViewPost shows amber draft banner with Publish button for author viewing their own draft
- Published posts display (edited) indicator on both ViewPost and PostCard when updatedAt > publishedAt
- EditPost contextually shows "Edit draft" or "Edit post" heading with appropriate button configuration

## Task Commits

Each task was committed atomically:

1. **Task 1: PostForm dual buttons and CreatePost draft save** - `7dde56a` (feat)
2. **Task 2: MyPosts page, Navbar link, and route wiring** - `c5494af` (feat)
3. **Task 3: ViewPost draft preview/publish, EditPost draft awareness, and (edited) indicator** - `f3e1646` (feat)

## Files Created/Modified
- `client/src/pages/MyPosts.jsx` - New contributor post inventory page (drafts + published)
- `client/src/components/PostForm.jsx` - Dual-action button pattern via onSaveDraft prop
- `client/src/pages/CreatePost.jsx` - Draft save handler + explicit status:'published' on publish
- `client/src/pages/EditPost.jsx` - Draft-aware heading, dual buttons for drafts, publish transition
- `client/src/pages/ViewPost.jsx` - Draft banner with Publish button, (edited) indicator, publishedAt date
- `client/src/components/PostCard.jsx` - "edited" indicator in feed, publishedAt date
- `client/src/components/Navbar.jsx` - "My Posts" link for contributors
- `client/src/App.jsx` - /my-posts route with ContributorRoute guard

## Decisions Made
- PostForm uses optional onSaveDraft callback to toggle between dual-button and single-button modes (clean separation of concerns)
- MyPosts uses simple filter+section approach rather than tabs for draft/published grouping (simpler, no extra state)
- ViewPost Publish uses window.location.reload() after navigate to force fresh component state after publish transition
- PostCard shows "edited" with middot separator (no parentheses) for feed-appropriate density

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete editorial workflow is functional: create drafts, edit drafts, publish from edit or preview, manage post inventory
- All 5 EDIT requirements complete
- Phase 14 (Drafts & Post Editing) is fully complete -- v1.0 milestone finalized

## Self-Check: PASSED

All 9 files verified present. All 3 task commits verified in git log.

---
*Phase: 14-drafts-post-editing*
*Completed: 2026-03-01*
