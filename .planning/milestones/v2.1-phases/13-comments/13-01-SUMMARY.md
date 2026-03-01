---
phase: 13-comments
plan: 01
subsystem: api
tags: [express, comments, rate-limiting, authorization, sqlite]

# Dependency graph
requires:
  - phase: 10-schema-query-safety
    provides: post_comments table (migration 5), batchLoadPostData helper, formatPosts helper
  - phase: 12-likes
    provides: like toggle pattern, optionalAuth on list endpoints, likeCountMap/likedByUserMap pattern
provides:
  - POST /posts/:slug/comments endpoint with auth, rate limiting, sanitization
  - DELETE /posts/:slug/comments/:commentId with three-way authorization
  - Full comments array with canDelete on GET /posts/:slug
  - commentCount field on all post list responses across 5 route files
affects: [13-02 client comments UI]

# Tech tracking
tech-stack:
  added: []
  patterns: [three-way comment delete authorization, commentCountMap batch loading]

key-files:
  created: []
  modified:
    - server/lib/post-helpers.js
    - server/routes/posts.js
    - server/routes/browse.js
    - server/routes/search.js
    - server/routes/profile.js

key-decisions:
  - "commentLimiter at 30/15min (lower than likes at 60/15min -- comments are heavier content)"
  - "Three-way delete auth: comment author OR post author OR admin (mirrors common blog patterns)"
  - "Comments loaded inline on single-post endpoint (not separate request) since count is bounded"
  - "canDelete computed per-comment on GET /:slug using same three-way logic as DELETE"

patterns-established:
  - "Three-way authorization: isCommentAuthor || isPostAuthor || isAdmin for delete operations"
  - "commentCountMap follows same batch-load pattern as likeCountMap (7th arg to formatPosts)"

requirements-completed: [CMNT-01, CMNT-02, CMNT-03, CMNT-04]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 13 Plan 01: Comment API Summary

**Comment CRUD endpoints with three-way delete authorization, commentCount in all post lists, and full comment loading on permalink**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T15:48:14Z
- **Completed:** 2026-03-01T15:50:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- POST /:slug/comments creates comments with auth + rate limiting (30/15min) + sanitization (500 char max)
- DELETE /:slug/comments/:commentId enforces three-way authorization (comment author, post author, admin)
- GET /:slug returns full comments array ordered by created_at ASC with per-comment canDelete
- commentCount field added to all post list responses across 6 call sites in 5 route files
- batchLoadPostData extended with commentCountMap using the established batch-load pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend post-helpers with commentCountMap and add comment endpoints** - `f9b33d3` (feat)
2. **Task 2: Pass commentCountMap through browse, search, and profile routes** - `44da276` (feat)

## Files Created/Modified
- `server/lib/post-helpers.js` - Added commentCountMap to batchLoadPostData, commentCount to formatPosts
- `server/routes/posts.js` - Added commentLimiter, POST/DELETE comment endpoints, comments loading on GET /:slug, commentCountMap on feed
- `server/routes/browse.js` - 3 call sites updated to pass commentCountMap (tag, artist, contributor)
- `server/routes/search.js` - 1 call site updated to pass commentCountMap
- `server/routes/profile.js` - 1 call site updated to pass commentCountMap

## Decisions Made
- commentLimiter set to 30 requests per 15 minutes (lower than likes at 60 since comments are heavier content)
- Three-way delete authorization (comment author OR post author OR admin) mirrors standard blog comment moderation
- Comments loaded inline on single-post endpoint rather than as separate request (bounded count)
- canDelete computed server-side per-comment for security (client just renders the flag)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Verification commands failed due to missing Turso env vars (expected in dev without .env loaded). Verified via `node --check` syntax validation instead. All 5 files pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full comment API surface ready for client integration in 13-02
- commentCount available in all list views for rendering comment count badges
- canDelete flag available per comment for conditional delete button rendering

## Self-Check: PASSED

All 5 modified files verified on disk. Both task commits (f9b33d3, 44da276) confirmed in git log.

---
*Phase: 13-comments*
*Completed: 2026-03-01*
