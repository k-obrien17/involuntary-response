---
status: diagnosed
phase: 04-browse-discovery-and-profiles
source: 04-01-SUMMARY.md, manual-plan-02 (profile panel, tag/artist/explore pages)
started: 2026-02-27T20:00:00Z
updated: 2026-02-27T20:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Browse by Tag
expected: Click a tag on any post in the feed. You land on /tag/{tag} showing the tag name as heading and a list of all posts with that tag (text preview, author, time).
result: pass

### 2. Browse by Artist
expected: Click an artist name under an embed (on a post card or permalink). You land on /artist/{name} showing the artist name, a round photo (or gray placeholder), and a list of all posts about that artist.
result: issue
reported: "I don't think there's an artist functionality"
severity: major

### 3. Contributor Profile via Author Click
expected: Click any author name on a post in the feed. A panel slides in from the right (50% width) showing the author's display name, @username, bio (if set), and their recent posts. A semi-transparent backdrop appears behind it.
result: issue
reported: "it does, but i don't like it - i think the contributor section should have its own page - so clicking on link takes you to a new page"
severity: major

### 4. Profile Panel Dismiss
expected: With the profile panel open, click the X button or click the backdrop. The panel slides back out to the right and the backdrop fades away.
result: skipped
reason: Panel being replaced with full-page navigation per Test 3 feedback

### 5. Full Profile Page
expected: Navigate to /u/{username} directly. You see the full profile page with display name, @username, bio, and all posts. If it's your own profile, an "Edit bio" button appears.
result: issue
reported: "good - but the link from under the post doesn't work yet"
severity: major

### 6. Explore Hub
expected: Navigate to /explore (or click Explore in the navbar if present). You see sections for Popular Tags, Artists (with round photos), and Contributors -- each linking to their respective browse pages.
result: pass

### 7. Text-First Responsive Layout
expected: All browse pages (tag, artist, profile, explore) use the same max-w-2xl centered column, generous whitespace, and large readable text as the main feed. No visual clutter or heavy UI chrome.
result: pass

## Summary

total: 7
passed: 3
issues: 3
pending: 0
skipped: 1

## Gaps

- truth: "Visitor can click an artist name under an embed and see all posts about that artist"
  status: failed
  reason: "User reported: I don't think there's an artist functionality"
  severity: major
  test: 2
  root_cause: "Two issues: (1) post_artists table likely empty — no posts created with Spotify embeds to trigger artist extraction. (2) Explore.jsx field name mismatch — uses artist.artist_name/artist.artist_image but API returns artist.name/artist.image."
  artifacts:
    - path: "client/src/pages/Explore.jsx"
      issue: "Field name mismatch: artist.artist_name should be artist.name, artist.artist_image should be artist.image"
    - path: "server/routes/browse.js"
      issue: "API maps artist_name→name, artist_image→image but Explore.jsx expects original DB column names"
  missing:
    - "Fix Explore.jsx field references to match API response shape"
    - "Test data: create a post with Spotify embed to verify artist extraction pipeline"
  debug_session: ""
- truth: "Clicking author name navigates to contributor's full profile page"
  status: failed
  reason: "User reported: slide-out panel works but user prefers full-page navigation — clicking author name should go to /u/{username} profile page, not open a panel. Also covers Test 5 (author link under post doesn't navigate)."
  severity: major
  test: 3
  root_cause: "PostCard, PostListItem, ViewPost use openProfile() from ProfilePanelContext which opens slide-out panel. User wants full-page navigation via Link to /u/{username} instead."
  artifacts:
    - path: "client/src/components/PostCard.jsx"
      issue: "Uses openProfile() instead of Link navigation"
    - path: "client/src/components/PostListItem.jsx"
      issue: "Uses openProfile() instead of Link navigation"
    - path: "client/src/pages/ViewPost.jsx"
      issue: "Uses openProfile() instead of Link navigation"
    - path: "client/src/App.jsx"
      issue: "Wraps app with ProfilePanelProvider and renders ProfilePanel"
    - path: "client/src/context/ProfilePanelContext.jsx"
      issue: "Should be deleted — no longer needed"
    - path: "client/src/components/ProfilePanel.jsx"
      issue: "Should be deleted — no longer needed"
  missing:
    - "Revert author clicks to Link navigation to /u/{username}"
    - "Remove ProfilePanel component and ProfilePanelContext"
    - "Remove provider wrapper and component from App.jsx"
  debug_session: ""
