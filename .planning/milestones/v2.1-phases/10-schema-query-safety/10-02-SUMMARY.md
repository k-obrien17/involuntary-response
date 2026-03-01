---
phase: 10-schema-query-safety
plan: 02
subsystem: api
tags: [sqlite, status-filter, cursor-pagination, draft-safety, shared-helpers]

# Dependency graph
requires:
  - phase: 10-schema-query-safety
    provides: "post-helpers.js shared module, posts.status column, posts.published_at column"
provides:
  - "Status filter (AND p.status = 'published') on all 10 public query sites across 5 route files"
  - "published_at cursor ordering on all paginated endpoints"
  - "Author-only draft preview on GET /posts/:slug via optionalAuth"
  - "Deduplicated batch-load/format/cursor code — only in post-helpers.js"
affects: [11-likes-comments, 12-drafts, 13-reader-registration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All public post queries include AND p.status = 'published'"
    - "GET /:slug uses optionalAuth for draft visibility guard"
    - "RSS feed uses published_at with created_at fallback for item dates"

key-files:
  created: []
  modified:
    - server/routes/browse.js
    - server/routes/search.js
    - server/routes/posts.js
    - server/routes/profile.js
    - server/routes/feed.js

key-decisions:
  - "posts.js GET /:slug returns status and publishedAt fields to prepare clients for draft workflow"
  - "feed.js uses published_at || created_at fallback for RSS date safety"

patterns-established:
  - "Every SQL query returning posts to unauthenticated users must include AND p.status = 'published'"
  - "All paginated post endpoints use published_at DESC for ORDER BY and cursor"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 10 Plan 02: Status Filter & Query Safety Summary

**Applied status = 'published' filter to all 10 public query sites, migrated cursor pagination to published_at, refactored 4 route files to use shared post-helpers.js, added optionalAuth draft preview on GET /posts/:slug**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T04:21:47Z
- **Completed:** 2026-03-01T04:24:42Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All 10 public query sites across 5 route files now filter by `p.status = 'published'` -- draft posts cannot leak to any public surface
- browse.js and search.js fully refactored: removed ~170 lines of duplicated batchLoadPostData/formatPosts/parseCursor/emailHash code, replaced with imports from post-helpers.js
- posts.js feed endpoint refactored to use shared helpers with published_at cursor pagination
- posts.js GET /:slug now uses optionalAuth + draft visibility guard -- authors can preview their own drafts while non-authors get 404
- profile.js refactored to use shared helpers, removed ~40 lines of inline batch-load code
- feed.js RSS output filtered to published posts only, ordered by published_at with created_at fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor browse.js and search.js to use shared helpers + add status filters** - `734d31d` (feat)
2. **Task 2: Apply status filters to posts.js, profile.js, and feed.js** - `ad5ebd3` (feat)

## Files Created/Modified
- `server/routes/browse.js` - Replaced local helpers with post-helpers.js imports, added status filter to all 6 query sites (tag, artist, contributor, 3 explore), switched to published_at ordering
- `server/routes/search.js` - Replaced local helpers with post-helpers.js imports, added status filter, switched to published_at ordering
- `server/routes/posts.js` - Refactored feed to use shared helpers + status filter, added optionalAuth + draft guard on GET /:slug, added publishedAt/status to single post response
- `server/routes/profile.js` - Replaced inline batch-load with shared helpers, added status filter + published_at ordering
- `server/routes/feed.js` - Added WHERE p.status = 'published', switched to published_at ordering, RSS dates use published_at with fallback

## Decisions Made
- GET /posts/:slug returns `status` and `publishedAt` fields in response -- prepares client for upcoming draft workflow without breaking existing consumers
- RSS feed uses `post.published_at || post.created_at` fallback for date safety, in case any backfilled rows have null published_at

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All public query sites are now draft-safe -- Phase 12 (drafts) can safely create draft posts without data leakage
- Shared helpers are imported by all route files -- Phase 11 (likes/comments) can extend formatPosts in one place
- requireContributor middleware (from Plan 01) is ready for route wiring in Phase 11
- No blockers for Phase 11 execution

## Self-Check: PASSED

- [x] server/routes/browse.js - FOUND
- [x] server/routes/search.js - FOUND
- [x] server/routes/posts.js - FOUND
- [x] server/routes/profile.js - FOUND
- [x] server/routes/feed.js - FOUND
- [x] 10-02-SUMMARY.md - FOUND
- [x] Commit 734d31d (Task 1) - FOUND
- [x] Commit ad5ebd3 (Task 2) - FOUND

---
*Phase: 10-schema-query-safety*
*Completed: 2026-03-01*
