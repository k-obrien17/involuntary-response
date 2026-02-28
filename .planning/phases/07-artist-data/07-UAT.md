---
status: complete
phase: 07-artist-data
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md]
started: 2026-02-28T15:10:00Z
updated: 2026-02-28T15:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Spotify embed auto-extracts artist
expected: Create a post with a Spotify track/album URL. After saving, the post displays the artist name automatically — you did not need to type it.
result: issue
reported: "didn't work - ideally it parses and displays who it thinks the artist is before you save/publish"
severity: major

### 2. Apple Music embed auto-extracts artist
expected: Create a post with an Apple Music track/album URL. After saving, the post displays the artist name automatically — you did not need to type it.
result: skipped
reason: Skipped to focus on remaining tests

### 3. Manual artist name input visible
expected: On the create post form, a text input labeled "Artist Name" appears between the embed and tag sections. You can type an artist name into it.
result: pass

### 4. Manual artist name saves and displays
expected: Create a post without an embed but with a typed artist name. After saving, the post appears in the feed with the artist name visible.
result: pass

### 5. Artist display on feed without embed
expected: A post that has an artist name but no embed still shows the artist name on the feed card — it is not hidden behind the embed conditional.
result: pass

### 6. Artist display on permalink without embed
expected: Navigate to a post's permalink page. The artist name is visible regardless of whether the post has an embed.
result: pass

### 7. Edit post pre-populates artist name
expected: Edit an existing post that has an artist. The artist name text input is pre-populated with the current artist name.
result: issue
reported: "Edit button not visible on permalink page — likely user.id vs post.authorId type mismatch (BigInt vs number) causing === to fail. Pre-existing auth bug, not Phase 7 specific."
severity: major

### 8. Browse-by-artist includes all sources
expected: Navigate to the browse-by-artist page and click an artist name. Posts from Spotify embeds, Apple Music embeds, and manual entries all appear in the results.
result: pass

## Summary

total: 8
passed: 5
issues: 2
pending: 0
skipped: 1

## Gaps

- truth: "Creating a post with a Spotify embed auto-populates the artist name without contributor action"
  status: failed
  reason: "User reported: didn't work - ideally it parses and displays who it thinks the artist is before you save/publish"
  severity: major
  test: 1
  artifacts: []
  missing: []
  debug_session: ""
- truth: "Edit an existing post that has an artist — artist name text input is pre-populated"
  status: failed
  reason: "User reported: Edit button not visible on permalink page — likely user.id vs post.authorId type mismatch (BigInt vs number)"
  severity: major
  test: 7
  artifacts: []
  missing: []
  debug_session: ""
