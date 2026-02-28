---
phase: 07-artist-data
plan: 01
subsystem: api
tags: [itunes-api, apple-music, artist-extraction, sqlite-migration]

# Dependency graph
requires:
  - phase: 05-embed-system
    provides: oEmbed resolver, post_artists table, Spotify artist extraction
provides:
  - Apple Music artist extraction via iTunes Search API
  - Manual artistName field support in POST/PUT /posts
  - Source tracking column on post_artists (spotify/apple/manual)
affects: [07-02, browse-by-artist, search]

# Tech tracking
tech-stack:
  added: []
  patterns: [extractAndInsertArtists helper for multi-source artist data, priority chain Spotify > Apple > manual]

key-files:
  created: [server/lib/apple-music.js]
  modified: [server/routes/posts.js, server/db/index.js]

key-decisions:
  - "Used iTunes Search API (public, no auth) rather than Apple Music API (requires developer token)"
  - "Auto-extraction priority: Spotify > Apple Music > manual artistName fallback"
  - "Refactored artist insertion into shared helper to eliminate duplication across POST/PUT"

patterns-established:
  - "extractAndInsertArtists: centralized multi-source artist extraction with priority chain and non-fatal error handling"
  - "Source tracking: all post_artists rows tagged with origin (spotify/apple/manual) for data provenance"

requirements-completed: [ART-01, ART-02, ART-03]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 7 Plan 1: Apple Music + Manual Artist Data Summary

**Apple Music artist extraction via iTunes Search API, manual artistName fallback, and source tracking migration on post_artists**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T14:56:57Z
- **Completed:** 2026-02-28T14:59:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Apple Music URLs now auto-extract artist names via public iTunes Search API (no API key needed)
- Manual artistName field accepted in POST/PUT /posts for posts without embeds
- Source column added to post_artists for data provenance tracking (spotify/apple/manual)
- Refactored artist insertion into shared helpers reducing code duplication

## Task Commits

Each task was committed atomically:

1. **Task 1: Apple Music artist extraction + source tracking migration** - `805231f` (feat)
2. **Task 2: Integrate Apple Music extraction + manual artistName into posts.js** - `d083c6d` (feat)

## Files Created/Modified
- `server/lib/apple-music.js` - Apple Music URL parser and iTunes Search API artist lookup
- `server/db/index.js` - Migration 4: source column on post_artists (DEFAULT 'spotify')
- `server/routes/posts.js` - Multi-source artist extraction in POST/PUT with insertArtists and extractAndInsertArtists helpers

## Decisions Made
- Used iTunes Search API (public, no auth) rather than Apple Music API (requires developer token) -- simpler, no credentials needed
- Auto-extraction takes priority over manual entry: Spotify > Apple Music > manual artistName fallback
- Refactored artist insertion into extractAndInsertArtists helper to centralize the priority logic and eliminate duplication between POST and PUT routes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. iTunes Search API is public with no API key.

## Next Phase Readiness
- Artist data now populated for all three embed types (Spotify, Apple Music, manual)
- Browse-by-artist queries can now leverage comprehensive artist data
- Source column enables filtering/reporting by data origin

## Self-Check: PASSED

All files and commits verified:
- server/lib/apple-music.js: FOUND
- server/routes/posts.js: FOUND
- server/db/index.js: FOUND
- 07-01-SUMMARY.md: FOUND
- Commit 805231f: FOUND
- Commit d083c6d: FOUND

---
*Phase: 07-artist-data*
*Completed: 2026-02-28*
