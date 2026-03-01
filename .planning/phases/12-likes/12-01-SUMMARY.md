---
phase: 12-likes
plan: 01
subsystem: api
tags: [express, likes, optionalAuth, batch-loading, rate-limiting]

# Dependency graph
requires:
  - phase: 10-schema
    provides: post_likes table, batchLoadPostData helper, formatPosts helper
provides:
  - "POST /posts/:slug/like toggle endpoint with auth + rate limiting"
  - "likeCount and likedByUser fields on all post responses"
  - "batchLoadPostData with userId parameter for liked-by-user state"
affects: [12-likes plan 02 (frontend LikeButton)]

# Tech tracking
tech-stack:
  added: []
  patterns: [batch like loading via GROUP BY, check-then-act toggle pattern]

key-files:
  created: []
  modified:
    - server/lib/post-helpers.js
    - server/routes/posts.js
    - server/routes/browse.js
    - server/routes/search.js
    - server/routes/profile.js

key-decisions:
  - "Check-then-act pattern for like toggle instead of INSERT OR IGNORE (per STATE.md Turso concern)"
  - "optionalAuth added to all 6 post-list endpoints for consistent likedByUser availability"
  - "Backward-compatible default parameters on formatPosts (likeCountMap={}, likedByUserMap={})"

patterns-established:
  - "Like toggle: SELECT existing -> DELETE or INSERT -> SELECT COUNT for final count"
  - "All post-list endpoints pass req.user?.id to batchLoadPostData for user-specific like state"

requirements-completed: [LIKE-01, LIKE-02, LIKE-03]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 12 Plan 01: Server-Side Like API Summary

**Like toggle endpoint, batch like counts, and likedByUser state across all 6 post-list endpoints**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T15:19:39Z
- **Completed:** 2026-03-01T15:22:52Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended batchLoadPostData to batch-load like counts (GROUP BY) and user-liked state in 2 queries
- Added likeCount and likedByUser fields to all post responses with backward-compatible defaults
- Created POST /posts/:slug/like toggle endpoint with authenticateToken + rate limiting (60/15min)
- Added optionalAuth to all 6 post-list endpoints (feed, tag, artist, contributor, search, profile)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend post-helpers with like data and add toggle endpoint** - `9fb27a1` (feat)
2. **Task 2: Add optionalAuth and like data to browse, search, and profile routes** - `a3f279f` (feat)

## Files Created/Modified
- `server/lib/post-helpers.js` - batchLoadPostData accepts userId, returns likeCountMap + likedByUserMap; formatPosts includes likeCount + likedByUser
- `server/routes/posts.js` - likeLimiter, optionalAuth on feed, POST /:slug/like toggle, likeCount/likedByUser on GET /:slug
- `server/routes/browse.js` - optionalAuth + like data on tag, artist, contributor routes
- `server/routes/search.js` - optionalAuth + like data on search route
- `server/routes/profile.js` - optionalAuth + like data on profile route

## Decisions Made
- Used check-then-act pattern (SELECT then INSERT/DELETE) for the like toggle instead of INSERT OR IGNORE, per STATE.md concern about Turso behavior
- Added optionalAuth to all post-list endpoints uniformly so likedByUser is available everywhere a post appears
- Used backward-compatible default parameters on formatPosts so existing callers without like maps still work

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete like API surface ready for frontend LikeButton component (Plan 02)
- All post responses include likeCount (number) and likedByUser (boolean)
- Toggle endpoint returns { liked, likeCount } for optimistic UI updates

## Self-Check: PASSED

All 5 modified files verified on disk. Both task commits (9fb27a1, a3f279f) verified in git log.

---
*Phase: 12-likes*
*Completed: 2026-03-01*
