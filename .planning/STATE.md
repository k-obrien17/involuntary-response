---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Reader Engagement & Editorial
status: unknown
last_updated: "2026-03-01T15:58:44.479Z"
progress:
  total_phases: 8
  completed_phases: 8
  total_plans: 15
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music -- and the music is right there to listen to.
**Current focus:** Phase 13 -- Comments

## Current Position

Phase: 13 of 14 (Comments)
Plan: 2 of 2 complete
Status: Phase 13 complete (Comments)
Last activity: 2026-03-01 -- Completed 13-02 (Comment UI)

Progress: [##############################] 100% overall (28/19+9 plans through v2.0+v2.1)
v2.1:    [################....] 8/9 plans complete

## Performance Metrics

**Velocity:**
- Total plans completed: 28 (v1.0: 12, v2.0: 7, v2.1: 8)
- v2.1 plans completed: 8

**By Phase (v2.1 -- current):**

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 10. Schema & Query Safety | 01 | 2min | 2 | 3 |
| 10. Schema & Query Safety | 02 | 3min | 2 | 5 |
| 11. Reader Accounts | 01 | 2min | 2 | 4 |
| 11. Reader Accounts | 02 | 2min | 2 | 8 |
| 12. Likes | 01 | 3min | 2 | 5 |
| 12. Likes | 02 | 2min | 2 | 5 |
| 13. Comments | 01 | 2min | 2 | 5 |
| 13. Comments | 02 | 1min | 2 | 3 |

**By Phase (v2.0 -- previous):**

| Phase | Plans | Status |
|-------|-------|--------|
| 6. Deployment & Avatars | 2 | Complete |
| 7. Artist Data | 3 | Complete |
| 8. Inline References | 1 | Complete |
| 9. Full-Text Search | 1 | Complete |

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table. Recent:
- LIKE-based search (v2.0) -- may need FTS5 if data grows
- BigInt coercion fix applied globally in db wrapper
- oEmbed resolver supports 6 providers
- [Phase 10]: parseCursor uses published_at instead of created_at for draft-aware feed ordering
- [Phase 10]: formatPosts response shape includes updatedAt and publishedAt fields
- [Phase 10]: GET /posts/:slug returns status and publishedAt fields to prepare clients for draft workflow
- [Phase 10]: RSS feed uses published_at || created_at fallback for date safety
- [Phase 11]: Separate /register-reader endpoint preserves invite-only contributor flow
- [Phase 11]: requireContributor middleware order: authenticateToken -> requireContributor -> rateLimiter
- [Phase 11]: Positive isContributor check (contributor OR admin) rather than negative role check for route guards
- [Phase 11]: ProtectedRoute import removed from App.jsx after ContributorRoute swap -- re-add in Phase 12 if needed
- [Phase 12]: Check-then-act pattern for like toggle (not INSERT OR IGNORE) due to Turso concern
- [Phase 12]: optionalAuth on all 6 post-list endpoints for consistent likedByUser availability
- [Phase 12]: Backward-compatible formatPosts defaults (likeCountMap={}, likedByUserMap={})
- [Phase 12]: LikeButton manages own liked/count state independently from parent post data (avoids stale closures)
- [Phase 12]: useRef for toggling guard (not useState) to prevent rapid double-tap without re-render
- [Phase 12]: PostListItem gets text-only count, not interactive button (too compact)
- [Phase 13-comments]: commentLimiter at 30/15min (lower than likes at 60 -- comments are heavier content)
- [Phase 13-comments]: Three-way delete auth: comment author OR post author OR admin
- [Phase 13-comments]: Comments loaded inline on single-post endpoint (not separate request)
- [Phase 13-comments]: Backward-compatible formatPosts defaults (commentCountMap={}) follows likeCountMap pattern
- [Phase 13-comments]: Text "Delete" button (not icon) for comment deletion, consistent with existing patterns
- [Phase 13-comments]: Optimistic delete with array rollback on error (matches LikeButton pattern)
- [Phase 13-comments]: Auth-aware compose: form for logged-in, Link to /join for visitors

### Key Research Findings (v2.1)

- Schema migration must batch all changes: posts.status, posts.published_at, post_likes, post_comments
- Status filter (`AND p.status = 'published'`) must be applied to 10 query sites across 5 route files before any draft can exist
- batchLoadPostData extraction prevents N+1 pattern in likes/comments phases
- Reader registration uses separate `/register-reader` endpoint (do not modify existing invite flow)
- node-cron or setInterval for scheduled publishing (deferred to future milestone)

### Pending Todos

None yet.

### Blockers/Concerns

- Spotify credentials still missing from server/.env (not blocking v2.1, affects artist extraction only)
- Turso INSERT OR IGNORE behavior should be validated for likes (known issue #2713)

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 13-02-PLAN.md (Comment UI)
Resume file: None
