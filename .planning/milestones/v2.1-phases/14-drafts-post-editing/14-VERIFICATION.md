---
phase: 14-drafts-post-editing
verified: 2026-03-01T17:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "Create a post as draft, find it in My Posts, click to edit, publish from EditPost"
    expected: "Post appears in feed at top ordered by publish time, not creation time"
    why_human: "Cannot verify feed ordering by publish time vs creation time without live data"
  - test: "Create a published post, edit it, return to feed"
    expected: "Feed card shows 'edited' indicator and ViewPost permalink shows '(edited)'"
    why_human: "Requires real timestamps where updatedAt > publishedAt to confirm indicator renders"
  - test: "Log in as a reader account, verify Navbar has no My Posts link and /my-posts redirects"
    expected: "No My Posts link visible; navigating to /my-posts redirects to home"
    why_human: "Role-gating requires live session with reader role to confirm ContributorRoute behavior"
---

# Phase 14: Drafts & Post Editing Verification Report

**Phase Goal:** Contributors can save work in progress, preview before publishing, and fix published posts after the fact
**Verified:** 2026-03-01T17:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria + Plan must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /posts with `status:'draft'` creates a post with `status='draft'` and `published_at=NULL` | VERIFIED | `server/routes/posts.js` line 165: `const status = req.body.status === 'draft' ? 'draft' : 'published'`; line 174: `${status === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL'}` |
| 2 | POST /posts with `status:'published'` (or omitted) creates a post with `published_at` set | VERIFIED | Same conditional logic — default is `'published'`, sets `CURRENT_TIMESTAMP` |
| 3 | PUT /posts/:slug with `status:'published'` on a draft sets `published_at=CURRENT_TIMESTAMP` | VERIFIED | lines 511-517: `isPublishing = post.status === 'draft' && newStatus === 'published'`; UPDATE sets `status='published', published_at=CURRENT_TIMESTAMP` |
| 4 | PUT /posts/:slug with `status:'draft'` on a published post returns 400 | VERIFIED | lines 498-500: `if (post.status === 'published' && newStatus === 'draft') return res.status(400).json({ error: 'Cannot unpublish a published post' })` |
| 5 | GET /posts/mine returns all posts (draft+published) for authenticated contributor | VERIFIED | lines 214-239: query has no status filter — returns all author's posts; status field included in response |
| 6 | GET /posts/mine returns 401 for unauthenticated and 403 for readers | VERIFIED | `authenticateToken` (line 214) returns 401 when no token; `requireContributor` (line 214) returns 403 when role is reader |
| 7 | Drafts do NOT appear in GET /posts feed, browse, search, or profile pages | VERIFIED | feed (posts.js line 135): `WHERE p.status = 'published'`; browse.js lines 21/66/115/153/163/173: all filter `status = 'published'`; search.js line 34: `AND p.status = 'published'` |
| 8 | Contributor can save a new post as draft and is redirected to edit it | VERIFIED | `CreatePost.jsx` line 28: `navigate('/posts/${res.data.slug}/edit')` after `status: 'draft'` create |
| 9 | Contributor can find their drafts in a My Posts page linked from the Navbar | VERIFIED | `Navbar.jsx` lines 107-112: `<Link to="/my-posts">My Posts</Link>` inside `{isContributor && ...}` block; `MyPosts.jsx` fetches via `posts.listMine()` and renders drafts section |
| 10 | Contributor can preview a draft at its permalink and see a Draft badge with a Publish button | VERIFIED | `ViewPost.jsx` lines 46-75: amber banner with "Draft" label and "Only you can see this post" rendered when `post.status === 'draft' && user && user.id === post.authorId` |
| 11 | Contributor can publish a draft from the preview and it appears at the top of the feed | VERIFIED | `ViewPost.jsx` lines 53-65: Publish button calls `posts.update(post.slug, { ..., status: 'published' })` then navigates and reloads. Feed orders by `published_at DESC` so new publish appears at top. |
| 12 | Contributor can edit a published post from its permalink | VERIFIED | `ViewPost.jsx` lines 151-158: Edit link visible to author; `EditPost.jsx` handles published posts — `handleSubmit` does not pass `status:'published'` when post is already published (no transition needed) |
| 13 | Edited published posts show an (edited) indicator on the permalink and in the feed | VERIFIED | `ViewPost.jsx` lines 145-148: renders `(edited)` when `updatedAt > publishedAt`; `PostCard.jsx` lines 69-75: renders `edited` with middot separator |
| 14 | Readers and logged-out visitors do not see My Posts link or draft-related UI | VERIFIED | `Navbar.jsx`: `My Posts` link inside `{isContributor && ...}` guard; `/my-posts` route in `App.jsx` wrapped in `<ContributorRoute>`; draft banner in `ViewPost.jsx` gated by `user.id === post.authorId` |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/routes/posts.js` | Draft-aware create, publish transition, /mine endpoint | VERIFIED | Lines 159-239: draft-aware POST, publish-transition PUT, GET /mine. All substantive — real SQL logic, no stubs. |
| `client/src/api/client.js` | `posts.listMine()` API method | VERIFIED | Line 52: `listMine: () => api.get('/posts/mine')` — present and wired |
| `client/src/pages/MyPosts.jsx` | Contributor's post inventory (drafts + published) | VERIFIED | 130 lines. Groups into drafts/published sections, links drafts to `/edit`, shows status badges, (edited) indicator, empty state |
| `client/src/components/PostForm.jsx` | Dual-action buttons: Publish + Save as draft | VERIFIED | Lines 79-109: conditional `onSaveDraft` prop shows/hides "Save as draft" button; primary button text adapts to context |
| `client/src/pages/ViewPost.jsx` | Draft badge, Publish button for author, (edited) indicator | VERIFIED | Lines 46-75: draft banner; lines 145-148: (edited) indicator; line 144: uses `publishedAt || createdAt` for date display |
| `client/src/components/PostCard.jsx` | (edited) indicator in feed cards | VERIFIED | Lines 69-75: `{post.updatedAt && post.publishedAt && new Date(post.updatedAt) > new Date(post.publishedAt) && (<>...<span>edited</span></>)}` |
| `client/src/components/Navbar.jsx` | My Posts link for contributors | VERIFIED | Lines 107-112: `<Link to="/my-posts">My Posts</Link>` inside `{isContributor && ...}` block |
| `client/src/App.jsx` | /my-posts route with ContributorRoute guard | VERIFIED | Lines 70-76: `<Route path="/my-posts" element={<ContributorRoute><MyPosts /></ContributorRoute>}` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `server/routes/posts.js POST /` | posts table | INSERT with conditional published_at | VERIFIED | Line 174: template literal sets `CURRENT_TIMESTAMP` or `NULL` based on status |
| `server/routes/posts.js PUT /:slug` | posts table | UPDATE with publish transition detection | VERIFIED | Lines 511-523: `isPublishing` flag drives two different UPDATE statements |
| `server/routes/posts.js GET /mine` | `batchLoadPostData` | shared helper for consistent response shape | VERIFIED | Line 227: `await batchLoadPostData(postIds, req.user.id)` |
| `client/src/pages/CreatePost.jsx` | posts.create API | `status:'draft'` or `status:'published'` in request body | VERIFIED | Line 15: `status: 'published'`; line 27: `status: 'draft'` |
| `client/src/pages/ViewPost.jsx` | posts.update API | Publish button calls update with `status:'published'` | VERIFIED | Lines 56-62: `posts.update(post.slug, { ..., status: 'published' })` |
| `client/src/components/Navbar.jsx` | `client/src/pages/MyPosts.jsx` | Link to /my-posts for contributors | VERIFIED | Lines 107-112 in Navbar; route registered in App.jsx line 70-76 |
| `client/src/pages/MyPosts.jsx` | posts.listMine API | useEffect fetch on mount | VERIFIED | Lines 11-23: `useEffect` calls `posts.listMine()`, sets state, renders results |

**Route ordering (critical):** `/mine` registered at line 214, `/:slug` at line 368. Express will match `/mine` before treating it as a slug parameter. Correct.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EDIT-01 | 14-01, 14-02 | Contributor can save a post as draft (not visible publicly) | SATISFIED | Draft create API + `status='published'` feed filter; CreatePost dual-button flow; MyPosts inventory |
| EDIT-02 | 14-02 | Contributor can preview a draft before publishing | SATISFIED | ViewPost renders draft banner (amber, "Only you can see this post") when author views own draft |
| EDIT-03 | 14-01, 14-02 | Contributor can publish a draft | SATISFIED | PUT /:slug publish transition (server); ViewPost Publish button + EditPost publish-on-submit (client) |
| EDIT-04 | 14-01, 14-02 | Contributor can edit a published post (content, embeds, tags) | SATISFIED | PUT /:slug replaces body, embed (DELETE+INSERT), artists, and tags; EditPost shows "Edit post" with "Save changes" |
| EDIT-05 | 14-02 | Edited posts show an "edited" indicator | SATISFIED | `updatedAt > publishedAt` detection in ViewPost (permalink) and PostCard (feed) |

No orphaned requirements. All 5 EDIT requirements claimed in plan frontmatter and verified in code.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

HTML `placeholder` attributes in PostForm.jsx and Navbar.jsx are legitimate form input hints, not code stubs.

---

### Human Verification Required

#### 1. Draft-to-published feed ordering

**Test:** Create a post as a draft (wait a few seconds), then publish it via the My Posts or ViewPost Publish button.
**Expected:** The published post appears at the top of the feed, ordered by `published_at` (the moment of publishing), not `created_at` (when draft was saved).
**Why human:** Requires real timestamps and a populated feed to observe ordering behavior visually.

#### 2. (edited) indicator rendering

**Test:** Create and publish a post, then edit its body and save. Return to the feed and the post permalink.
**Expected:** Feed card shows `· edited` next to the date. Permalink shows `(edited)` after the date.
**Why human:** Requires actual `updatedAt > publishedAt` database state from real edits; can't assert this from static file inspection alone.

#### 3. Reader role gate on My Posts

**Test:** Register a reader account (via /join), log in, inspect Navbar.
**Expected:** No "My Posts" link visible. Navigating to `/my-posts` redirects to home (ContributorRoute behavior).
**Why human:** Role-gating logic requires a live session with reader role to confirm ContributorRoute redirects correctly for non-contributors.

---

### Gaps Summary

No gaps. All 14 observable truths verified, all 8 artifacts are substantive and wired, all 7 key links confirmed, all 5 EDIT requirements satisfied. Build compiles cleanly (126 modules, no errors). All 5 commit hashes from SUMMARY files verified in git log.

---

_Verified: 2026-03-01T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
