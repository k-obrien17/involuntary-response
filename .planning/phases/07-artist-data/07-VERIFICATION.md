---
phase: 07-artist-data
verified: 2026-02-28T15:30:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 7: Artist Data Verification Report

**Phase Goal:** Every post reliably has an artist name -- auto-extracted from embeds or manually entered -- and browse-by-artist works across all embed types
**Verified:** 2026-02-28T15:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Creating a post with a Spotify embed auto-populates the artist name without contributor action | VERIFIED | `extractAndInsertArtists()` in `server/routes/posts.js` calls `getArtistsForSpotifyUrl(embedUrl)` first in the priority chain; inserts with `source='spotify'` |
| 2 | Creating a post with an Apple Music embed auto-populates the artist name without contributor action | VERIFIED | Same helper calls `getArtistsForAppleMusicUrl(embedUrl)` when Spotify returns nothing; `server/lib/apple-music.js` fully implemented with iTunes Search API |
| 3 | Contributor can manually type an artist name when auto-extraction fails or no embed is present | VERIFIED | `PostForm.jsx` has an artist name text input; `CreatePost.jsx` and `EditPost.jsx` both pass `artistName` to the API; server accepts and stores it with `source='manual'` when no auto-extraction occurs |
| 4 | Artist name is visible on every post in the feed and on the permalink page | VERIFIED | `PostCard.jsx` renders the artists block as a sibling of the embed block (not nested inside `{post.embed && ...}`); same fix applied in `ViewPost.jsx` |
| 5 | Browse-by-artist page includes posts from Spotify, Apple Music, and manually-entered artists | VERIFIED | `GET /browse/artist/:name` in `server/routes/browse.js` queries `post_artists` with `WHERE pa.artist_name = ? COLLATE NOCASE` — no filter on `source` column, so all three origins are included |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/lib/apple-music.js` | Apple Music iTunes Search API artist extraction | VERIFIED | Exports `parseAppleMusicUrl` and `getArtistsForAppleMusicUrl`; 5s AbortSignal timeout; returns `[]` on any failure; 57 lines, fully substantive |
| `server/routes/posts.js` | Post CRUD with Apple Music extraction + manual artistName support | VERIFIED | Imports `getArtistsForAppleMusicUrl`; `extractAndInsertArtists()` helper handles Spotify > Apple > manual priority chain in both POST and PUT routes; `source` field included in all INSERT statements |
| `server/db/index.js` | Migration adding source column to post_artists | VERIFIED | Migration `add_post_artists_source` at index 160-162: `ALTER TABLE post_artists ADD COLUMN source TEXT DEFAULT 'spotify'` |
| `client/src/components/PostForm.jsx` | Artist name text input field | VERIFIED | `artistName` state, text input between embed and tag sections, included in `onSubmit` payload as `null` when empty |
| `client/src/components/PostCard.jsx` | Artist display outside embed conditional block | VERIFIED | Artists block is a sibling of `{post.embed && ...}`, not nested inside it |
| `client/src/pages/ViewPost.jsx` | Artist display outside embed conditional block | VERIFIED | Same structural fix as PostCard — artist block at lines 52-66, embed block at lines 46-51 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `server/routes/posts.js` | `server/lib/apple-music.js` | `import getArtistsForAppleMusicUrl` | WIRED | Line 9: `import { getArtistsForAppleMusicUrl } from '../lib/apple-music.js'`; called at line 83 inside `extractAndInsertArtists` |
| `server/routes/posts.js` | `server/db/index.js` | `INSERT INTO post_artists with source field` | WIRED | Line 53: `INSERT OR IGNORE INTO post_artists (post_id, artist_name, artist_image, spotify_id, source) VALUES (?, ?, ?, ?, ?)` |
| `client/src/components/PostForm.jsx` | `client/src/pages/CreatePost.jsx` | `onSubmit callback includes artistName` | WIRED | `PostForm` calls `onSubmit({ body, embedUrl, tags, artistName: artistName.trim() || null })`; `CreatePost.handleSubmit` destructures `artistName` and passes to `posts.create()` |
| `client/src/pages/CreatePost.jsx` | `server/routes/posts.js` | `posts.create({ body, embedUrl, tags, artistName })` | WIRED | Line 15 in CreatePost: `posts.create({ body, embedUrl, tags, artistName })`; server receives `req.body.artistName` at line 221 |
| `client/src/components/PostCard.jsx` | `server/routes/browse.js` | `Link to /artist/:name` | WIRED | Line 24 in PostCard: `to={\`/artist/${encodeURIComponent(artist.name)}\`}`; App.jsx registers `<Route path="/artist/:name" element={<ArtistPage />} />`; ArtistPage calls `browse.byArtist(name)` which maps to `GET /browse/artist/:name` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ART-01 | 07-01 | Post creation auto-extracts artist name from Spotify embed | SATISFIED | `getArtistsForSpotifyUrl` called first in `extractAndInsertArtists`; existing Spotify extraction preserved and updated to include `source='spotify'` |
| ART-02 | 07-01 | Post creation auto-extracts artist name from Apple Music embed | SATISFIED | `getArtistsForAppleMusicUrl` implemented in `server/lib/apple-music.js`; called in `extractAndInsertArtists` with `source='apple'` |
| ART-03 | 07-01, 07-02 | Contributor can manually enter artist name when auto-extraction fails or no embed | SATISFIED | Server: `artistName` field accepted in POST/PUT, stored with `source='manual'` only when auto-extraction returns nothing. Client: text input in PostForm, wired through CreatePost and EditPost |
| ART-04 | 07-02 | Artist name displayed on every post in feed and permalink views | SATISFIED | PostCard and ViewPost both render artist blocks outside the embed conditional — display is independent of embed presence |
| ART-05 | 07-02 | Browse-by-artist includes posts from all embed types | SATISFIED | `/browse/artist/:name` queries `post_artists` by `artist_name COLLATE NOCASE` with no `source` filter — all three origins (spotify/apple/manual) are returned |

All 5 requirement IDs from plan frontmatter accounted for. No orphaned requirements.

---

## Anti-Patterns Found

None. Scanned all 7 modified files:
- No TODO/FIXME/XXX/HACK comments
- `return null` and `return []` occurrences are all legitimate guard clauses, not stubs
- No empty handlers or placeholder implementations
- No static responses masking unimplemented logic

---

## Human Verification Required

### 1. Apple Music auto-extraction end-to-end

**Test:** Create a post with an Apple Music URL (e.g., `https://music.apple.com/us/album/thriller/269572838`). Check that the artist name appears on the post card after creation without typing anything.
**Expected:** Artist name "Michael Jackson" (or similar) appears as a link below the embed.
**Why human:** iTunes Search API is a live external service — cannot verify integration is live without a running server and real network call.

### 2. Manual artist name fallback when no embed

**Test:** Create a post with text only (no embed URL), type "Radiohead" in the artist field, submit. View the post in the feed.
**Expected:** "Radiohead" appears as a link to `/artist/Radiohead` even though there is no embed.
**Why human:** Requires live app interaction to confirm the display path for embed-less posts with manual artist data.

### 3. Edit pre-population of artist name

**Test:** Edit an existing post that has artist data. Confirm the artist input field is pre-populated with the current artist name.
**Expected:** The artist text input shows the artist name from the existing post.
**Why human:** Requires live app state loading to verify `post.artists?.[0]?.name` pre-population works correctly.

---

## Commits Verified

All four commits documented in SUMMARY files exist in git log:

| Commit | Task | Plan |
|--------|------|------|
| `805231f` | Apple Music extraction + migration | 07-01 Task 1 |
| `d083c6d` | Integrate Apple Music + manual artistName into posts.js | 07-01 Task 2 |
| `c4df58e` | Add artist name input to PostForm, wire CreatePost/EditPost | 07-02 Task 1 |
| `713add2` | Move artist display outside embed conditional | 07-02 Task 2 |

---

## Summary

Phase 7 goal is fully achieved. All five success criteria are met by substantive, wired implementations:

- **ART-01/ART-02:** `extractAndInsertArtists()` in `posts.js` implements a clean Spotify > Apple Music > manual priority chain. Apple Music extraction uses the public iTunes Search API (no credentials needed) with proper timeout and non-fatal error handling — matching the pattern established by the existing Spotify extractor.

- **ART-03:** Manual artist name flows correctly from PostForm input → CreatePost/EditPost page handlers → `posts.create()`/`posts.update()` API calls → server sanitization → `post_artists` insertion with `source='manual'`. EditPost pre-populates from `post.artists?.[0]?.name`.

- **ART-04:** Both PostCard (feed) and ViewPost (permalink) render the artist block as a top-level sibling of the embed block, not nested inside it. A post with no embed but a manual artist will display the artist name.

- **ART-05:** Browse-by-artist (`GET /browse/artist/:name`) queries `post_artists` by artist name with case-insensitive matching and no source filter — Spotify, Apple Music, and manual entries all appear. The client `ArtistPage` is wired to this endpoint. PostCard artist links route to `/artist/:name`.

The source tracking migration (`add_post_artists_source`) correctly defaults existing rows to `'spotify'` (previously the only source), and new rows from this phase are tagged with the correct origin.

Three human verification items remain for live integration testing (external iTunes API call, manual-only post display, edit pre-population) — none represent code gaps.

---

_Verified: 2026-02-28T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
