---
phase: 13-comments
verified: 2026-03-01T16:15:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 13: Comments Verification Report

**Phase Goal:** Readers can leave short reactions on posts, and post authors and admins can moderate them
**Verified:** 2026-03-01T16:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /posts/:slug/comments creates a comment and returns it with author info and canDelete | VERIFIED | `server/routes/posts.js` lines 248–292: authenticateToken + commentLimiter, INSERT INTO post_comments, SELECT with JOIN users, returns 201 with `{id, body, createdAt, author, canDelete: true}` |
| 2 | DELETE /posts/:slug/comments/:commentId enforces three-way authorization (self, post author, admin) | VERIFIED | `server/routes/posts.js` lines 295–330: isCommentAuthor `=== req.user.id`, isPostAuthor `=== req.user.id`, isAdmin `=== 'admin'`; 403 if none true |
| 3 | GET /posts/:slug returns a comments array ordered by created_at ASC with canDelete per comment | VERIFIED | `server/routes/posts.js` lines 386–409: SELECT with JOIN users ORDER BY created_at ASC, per-comment canDelete using same three-way logic, included in response JSON as `comments` |
| 4 | All post-list endpoints include commentCount via batchLoadPostData | VERIFIED | `server/lib/post-helpers.js` lines 81–87: query post_comments GROUP BY post_id, `formatPosts` 7th param `commentCountMap = {}`, `commentCount: commentCountMap[p.id] \|\| 0`; all 5 route files (posts, browse×3, search, profile) pass commentCountMap as 7th arg |
| 5 | Logged-in user can type and submit a comment on a post's permalink page | VERIFIED | `CommentSection.jsx` lines 14–28: handleSubmit calls `posts.addComment(postSlug, body.trim())`, appends `res.data` to comments array, clears body |
| 6 | Comments render chronologically below the post content with author avatar, display name, and relative timestamp | VERIFIED | `CommentSection.jsx` lines 50–77: maps `comments`, renders `Avatar` with emailHash/displayName/size=24, author displayName span, `relativeTime(comment.createdAt)`, comment body `<p>` |
| 7 | Comment author sees a delete button on their own comments | VERIFIED | `CommentSection.jsx` line 68: `{comment.canDelete && (<button ...>Delete</button>)}`; server sets canDelete=true for comment author |
| 8 | Post author and admin see a delete button on all comments | VERIFIED | `server/routes/posts.js` lines 405–408: canDelete set to true when `req.user && post.author_id === req.user.id` OR `req.user && req.user.role === 'admin'`; client renders button when canDelete=true |
| 9 | Logged-out visitor sees comments but no compose form and no delete buttons | VERIFIED | `CommentSection.jsx` lines 80–117: form only rendered when `user` is not null; delete button only when `comment.canDelete` (which requires req.user server-side, so always false for anonymous); logged-out users see Link to /join instead |
| 10 | Deleted comment disappears from the list immediately without page refresh | VERIFIED | `CommentSection.jsx` lines 30–39: handleDelete optimistically calls `setComments(comments.filter((c) => c.id !== commentId))` before API call, restores `prev` on catch |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/lib/post-helpers.js` | commentCountMap in batchLoadPostData, commentCount in formatPosts | VERIFIED | Lines 21, 81–87, 89, 114 — commentCountMap initialized, batch-loaded from post_comments, returned, applied in formatPosts as 7th parameter |
| `server/routes/posts.js` | Comment create and delete endpoints, full comment loading on permalink | VERIFIED | 526 lines — POST /:slug/comments (ln 248), DELETE /:slug/comments/:commentId (ln 295), comments loading in GET /:slug (ln 386), commentLimiter (ln 38) |
| `client/src/components/CommentSection.jsx` | Comment list, compose form, delete handling; min 60 lines | VERIFIED | 120 lines — substantive implementation: list render, handleSubmit, handleDelete, auth-aware form, logged-out prompt |
| `client/src/api/client.js` | posts.addComment and posts.deleteComment methods | VERIFIED | Lines 50–51: `addComment: (slug, body) => api.post(...)`, `deleteComment: (slug, commentId) => api.delete(...)` |
| `client/src/pages/ViewPost.jsx` | CommentSection rendered below post content | VERIFIED | Lines 9, 93–97: import CommentSection, rendered with postSlug, initialComments, postAuthorId props |
| `server/routes/browse.js` | 3 call sites pass commentCountMap | VERIFIED | Lines 31–32, 76–77, 125–126 — all three route handlers (tag, artist, contributor) destructure and pass commentCountMap |
| `server/routes/search.js` | 1 call site passes commentCountMap | VERIFIED | Lines 45–46 — destructures and passes commentCountMap |
| `server/routes/profile.js` | 1 call site passes commentCountMap | VERIFIED | Lines 39–40 — destructures and passes commentCountMap |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `server/routes/posts.js` | `server/lib/post-helpers.js` | formatPosts with commentCountMap parameter | WIRED | Line 146: `const { ..., commentCountMap } = await batchLoadPostData(...)`, line 147: `formatPosts(rows, ..., commentCountMap)` |
| `server/routes/posts.js POST /:slug/comments` | post_comments table | INSERT INTO post_comments | WIRED | Line 265: `INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)` |
| `server/routes/posts.js DELETE /:slug/comments/:commentId` | post_comments table | DELETE with three-way auth check | WIRED | Lines 315–323: `isCommentAuthor \|\| isPostAuthor \|\| isAdmin` check before `DELETE FROM post_comments WHERE id = ?` |
| `client/src/components/CommentSection.jsx` | /api/posts/:slug/comments | posts.addComment and posts.deleteComment API calls | WIRED | Lines 20, 35: `posts.addComment(postSlug, body.trim())` and `posts.deleteComment(postSlug, commentId)` both called with response handling |
| `client/src/pages/ViewPost.jsx` | `client/src/components/CommentSection.jsx` | import and render with postSlug, initialComments, postAuthorId props | WIRED | Line 9: import; lines 93–97: `<CommentSection postSlug={post.slug} initialComments={post.comments \|\| []} postAuthorId={post.authorId} />` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CMNT-01 | 13-01, 13-02 | Reader can post a top-level comment on a post | SATISFIED | POST /:slug/comments accepts authenticated requests; CommentSection submits via posts.addComment; sanitize() enforces 500-char max |
| CMNT-02 | 13-01, 13-02 | Comments display chronologically on the post permalink | SATISFIED | GET /:slug returns comments ORDER BY created_at ASC; CommentSection maps the array in order; relativeTime() formats timestamps |
| CMNT-03 | 13-01, 13-02 | Comment author can delete their own comment | SATISFIED | DELETE endpoint: `isCommentAuthor = comment.user_id === req.user.id`; UI: canDelete=true returned to own author; handleDelete called on button click with optimistic removal |
| CMNT-04 | 13-01, 13-02 | Post author and admin can delete any comment on the post | SATISFIED | DELETE endpoint: `isPostAuthor = post.author_id === req.user.id` OR `isAdmin = req.user.role === 'admin'`; canDelete computed server-side on GET /:slug with same logic; UI renders delete button when canDelete=true |

All four requirements (CMNT-01 through CMNT-04) are fully satisfied. No orphaned requirements — all IDs from both plans are accounted for and verified.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `client/src/components/CommentSection.jsx` | 86 | `placeholder=` HTML attribute | Info | Not an anti-pattern — this is the textarea placeholder text "Leave a comment..." which is correct UI |
| `server/routes/posts.js` | 47 | `return null` | Info | Inside `sanitize()` helper — correct: returns null for null input, not a stub |

No blocker or warning anti-patterns found.

---

## Human Verification Required

### 1. End-to-end comment creation flow

**Test:** Log in as a reader account, navigate to any published post permalink, type a comment in the textarea, click "Post"
**Expected:** Comment appears immediately below the form in chronological order with your avatar, display name, relative timestamp, and a "Delete" button
**Why human:** Optimistic append to local state, Avatar rendering with Gravatar hash, and relative timestamp display require live browser interaction

### 2. Delete button authorization scope

**Test:** Log in as reader A and post a comment. Log out. Log in as reader B (not the post author). Navigate to the same post.
**Expected:** Reader B should NOT see a Delete button on reader A's comment; only reader A, the post author, and admins should see it
**Why human:** canDelete is computed server-side per-comment — requires multiple accounts and live session to verify the boundary is correct in practice

### 3. Logged-out visitor experience

**Test:** Open a post permalink in an incognito window
**Expected:** Comments are visible in full; no compose textarea is shown; a "Log in" link to /join appears below the comment list
**Why human:** Auth state check (`user === null`) and conditional rendering require browser session context

### 4. Optimistic delete rollback on API error

**Test:** Artificially cause a DELETE request to fail (e.g., revoke auth token), then click Delete on a comment
**Expected:** Comment disappears immediately, then reappears when the API call fails
**Why human:** Requires simulating an API error — cannot verify rollback path with static code inspection alone

---

## Gaps Summary

No gaps. All ten observable truths are fully verified at all three levels (exists, substantive, wired).

**Phase 13 assessment:** The comment system is fully implemented end-to-end. The server API surface (POST/DELETE endpoints, commentCount in list views, full comment array with per-comment canDelete on permalink) and the client UI (CommentSection component, API client methods, ViewPost integration) are all substantive, correctly wired, and committed to git (commits f9b33d3, 44da276, 5c1e399, 9c3974f). All four requirements CMNT-01 through CMNT-04 are satisfied. The only items flagged for human verification are interactive browser behaviors that cannot be confirmed via static analysis.

---

_Verified: 2026-03-01T16:15:00Z_
_Verifier: Claude (gsd-verifier)_
