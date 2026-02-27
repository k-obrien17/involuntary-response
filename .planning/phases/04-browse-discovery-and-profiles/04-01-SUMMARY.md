---
phase: 04-browse-discovery-and-profiles
plan: 01
subsystem: api
tags: [express, sqlite, spotify-api, browse, discovery, profile, cursor-pagination]

requires:
  - phase: 02-post-creation-and-embeds
    provides: posts, post_embeds, post_tags tables and embed resolution
  - phase: 03-feed-and-post-display
    provides: cursor pagination pattern and batch IN() loading pattern
provides:
  - post_artists table for artist-post relationships
  - users.bio column for contributor profiles
  - Browse API endpoints (tag, artist, contributor, explore)
  - Profile API endpoints (public profile, bio update)
  - Shared Spotify token cache and artist extraction utility
affects: [04-browse-discovery-and-profiles, 05-sharing-and-export]

tech-stack:
  added: [server/lib/spotify.js]
  patterns: [batchLoadPostData helper for consistent post data loading, consistent post response shape across all endpoints]

key-files:
  created:
    - server/lib/spotify.js
    - server/routes/browse.js
    - server/routes/profile.js
  modified:
    - server/db/index.js
    - server/routes/posts.js
    - server/index.js

key-decisions:
  - "Separate Spotify token cache in lib/spotify.js rather than modifying routes/artists.js to avoid breakage"
  - "Artist extraction is Spotify-only; Apple Music posts will not have post_artists entries"
  - "Profile routes mounted before admin user routes on /api/users for correct Express matching"
  - "batchLoadPostData helper in browse.js for DRY post data loading across all browse endpoints"
  - "Explore endpoint ranks by most recent post activity, not count"

patterns-established:
  - "Consistent post response shape: { id, slug, body, createdAt, author, embed, tags, artists } across feed, browse, and profile"
  - "Non-fatal artist extraction: Spotify API failures never block post creation or updates"
  - "batchLoadPostData(postIds) pattern for batch-loading embeds, tags, and artists"

requirements-completed: [DISC-02, DISC-03, DISC-04, PROF-02, PROF-03]

duration: 4min
completed: 2026-02-27
---

# Phase 4 Plan 1: Browse, Discovery, and Profiles API Summary

**Browse/explore/profile API layer with post_artists table, shared Spotify utility, and 6 new endpoints serving consistent post shapes with artists array**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T18:53:43Z
- **Completed:** 2026-02-27T18:58:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Database migration adds post_artists table (composite PK, NOCASE index) and users.bio column
- Shared Spotify utility (lib/spotify.js) with token cache, URL parser, and artist fetcher for reuse
- Artist data automatically extracted and stored during post create/update (non-fatal)
- Feed endpoint now includes artists array in each post response
- Four browse endpoints: tag, artist, contributor, explore -- all cursor-paginated with consistent post shape
- Profile endpoints: public profile with all posts, authenticated bio update (sanitized, max 300 chars)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration, shared Spotify utility, and artist extraction in post routes** - `e577a73` (feat)
2. **Task 2: Browse, explore, and profile API endpoints with route mounting** - `4e1547e` (feat)

## Files Created/Modified
- `server/db/index.js` - Migration 3: post_artists table + users.bio column
- `server/lib/spotify.js` - Shared Spotify token cache, URL parser, artist fetcher
- `server/routes/posts.js` - Artist extraction in create/update, artists in feed response
- `server/routes/browse.js` - Tag, artist, contributor, and explore browse endpoints
- `server/routes/profile.js` - Public profile GET and authenticated bio PUT
- `server/index.js` - Mount browse and profile routes

## Decisions Made
- Kept artists.js token cache untouched; new lib/spotify.js has its own cache to avoid breaking existing search
- Artist extraction only for Spotify URLs (Apple Music has no equivalent metadata API)
- Explore endpoint orders by recency (MAX(created_at)) not count -- surfaces fresh content
- Profile routes mounted before admin user routes on same /api/users prefix for correct Express matching
- batchLoadPostData helper extracted in browse.js for DRY data loading

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All browse and profile API endpoints ready for Phase 4 Plan 2 (client-side pages)
- Consistent post response shape established across feed, browse, and profile endpoints
- Artists array available in all post responses for clickable artist name links

## Self-Check: PASSED

All created files verified on disk. All commit hashes found in git log.

---
*Phase: 04-browse-discovery-and-profiles*
*Completed: 2026-02-27*
