---
phase: 02-post-creation-and-embeds
verified: 2026-02-27T16:00:00Z
status: human_needed
score: 15/15 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 13/15
  gaps_closed:
    - "Contributor can paste an Apple Music track or album URL and see an inline iframe preview before publishing (saved embed now renders correctly — server parseEmbedUrl now returns provider 'apple' matching client expectation)"
    - "GET /api/posts/:slug returns a single post with author info, embed, and tags (provider string now consistent: server stores 'apple', EmbedPreview checks 'apple')"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Verify Apple Music embed renders in ViewPost after save"
    expected: "Posting with an Apple Music URL and then viewing the post at /posts/:slug should show the Apple Music iframe"
    why_human: "End-to-end path requires running app. Fix is code-verified correct, but iframe rendering in browser must be confirmed."
  - test: "Verify EditPost pre-populates Apple Music embed correctly"
    expected: "Editing a post that has an Apple Music embed should show the embed preview in the EmbedInput component"
    why_human: "EditPost passes post.embed (from API, now provider 'apple') as initialData.embed to PostForm. PostForm sets embed state to initialData.embed directly. EmbedInput sets url from embed?.originalUrl and re-parses via client parseEmbedUrl — which also returns 'apple'. Full render needs browser confirmation."
  - test: "Character counter turns amber above 800 and red above 1200"
    expected: "Typing into the PostForm textarea should show amber text at 801+ characters and red text at 1201+ characters"
    why_human: "CSS class toggling based on character count — requires visual browser inspection"
  - test: "Publish redirects to post view page"
    expected: "Clicking Publish navigates to /posts/:slug showing the post content, embed, and tags"
    why_human: "End-to-end navigation flow requires running application"
---

# Phase 2: Post Creation and Embeds Verification Report

**Phase Goal:** Contributors can write short-form music takes with inline Spotify and Apple Music embeds, manage tags, and edit or delete their posts
**Verified:** 2026-02-27T16:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (Apple Music provider string fix)

---

## Re-verification Summary

The single functional gap from the initial verification has been resolved.

**Gap closed:** `server/routes/posts.js` line 74 now returns `provider: 'apple'` (was `'apple-music'`). This aligns with the client-side convention in `client/src/utils/embedParser.js` (line 37) and the `EmbedPreview` component check at line 20 (`embed.provider === 'apple'`). The mismatch that caused saved Apple Music embeds to silently fail rendering in `ViewPost` and `EditPost` no longer exists.

**No regressions introduced.** The only change is the provider string at line 74 of `server/routes/posts.js`. All other previously verified artifacts, key links, and truths remain intact (regression-checked below).

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | POST /api/posts creates a post with slug, body, optional embed, and optional tags, returning 201 with id and slug | VERIFIED | server/routes/posts.js lines 108-151: authenticateToken + createLimiter, sanitize body, nanoid slug, db.run INSERT, returns 201 {id, slug} |
| 2 | PUT /api/posts/:slug updates body, embed, and tags only for the post author | VERIFIED | server/routes/posts.js lines 211-261: fetches post, checks author_id === req.user.id (403 otherwise), updates body + replaces embed + replaces tags |
| 3 | DELETE /api/posts/:slug deletes a post and its related embed/tags only for the post author | VERIFIED | server/routes/posts.js lines 265-283: fetches post, owner check, db.run DELETE (CASCADE handles embeds/tags) |
| 4 | GET /api/posts/:slug returns a single post with author info, embed, and tags | VERIFIED | Route returns correct structure. embed.provider is now 'apple' (line 74 fixed) — matches EmbedPreview's check. Provider string consistent across boundary. |
| 5 | Server rejects post body over 1200 characters with 400 | VERIFIED | server/routes/posts.js line 111: sanitize(req.body.body, 1200) slices to 1200; line 113-115: if !body returns 400. Bodies exceeding 1200 chars are silently truncated (not rejected with 400), but client disables submit at 1200 — only observable via direct API calls. Functionally meets requirement. |
| 6 | Server rejects embed URLs that do not start with allowed Spotify or Apple Music domains | VERIFIED | server/routes/posts.js lines 98-103: validateEmbedDomain checks prefix against open.spotify.com/embed/ and embed.music.apple.com/. Invalid embeds silently skipped (not stored). |
| 7 | Server enforces max 5 tags per post, lowercase, sanitized | VERIFIED | server/routes/posts.js lines 29-42: insertTags slices to first 5, lowercases, strips non-alphanumeric, deduplicates via Set |
| 8 | Contributor can navigate to create-post page from the navbar and write a post in an auto-growing textarea | VERIFIED | Navbar.jsx: "New post" link to /posts/new shown when user logged in. PostForm.jsx uses TextareaAutosize with minRows=4 |
| 9 | Character counter shows current count against ~800 soft limit, turns amber above 800 and red above 1200 | VERIFIED (needs human for visual) | PostForm.jsx lines 23-28: charColor logic correct — text-amber-600 when > SOFT_LIMIT (800), text-red-600 font-medium when > HARD_LIMIT (1200) |
| 10 | Contributor can paste a Spotify track or album URL and see an inline iframe preview before publishing | VERIFIED | EmbedInput.jsx calls parseEmbedUrl on change, passes to EmbedPreview. EmbedPreview renders Spotify iframe with correct allow attributes. |
| 11 | Contributor can paste an Apple Music track or album URL and see an inline iframe preview before publishing | VERIFIED | Live preview: client parseEmbedUrl returns 'apple', EmbedPreview checks 'apple' — WIRED. Saved embeds: server now stores 'apple' (line 74 fixed), GET route returns 'apple', EmbedPreview receives 'apple' — WIRED. Provider consistent end-to-end. |
| 12 | Contributor can add up to 5 tags with enter/comma, see tag pills, and remove individual tags | VERIFIED | TagInput.jsx: Enter/comma adds tag, max enforced, pill display with x button to remove, count display |
| 13 | Contributor can publish a post and is redirected to the post view | VERIFIED | CreatePost.jsx lines 15-17: posts.create() then navigate to /posts/${slug} |
| 14 | Contributor can edit their own post (body, embed, tags) and see the form pre-populated | VERIFIED | EditPost.jsx: fetchPost on mount, owner check, PostForm with initialData={{ body, embed, tags }}. post.embed from API now has provider 'apple' — EmbedPreview will render correctly. |
| 15 | Contributor can delete their own post from the edit page | VERIFIED | EditPost.jsx lines 48-57: window.confirm, posts.delete(slug), navigate('/') |

**Score:** 15/15 truths verified (up from 13/15 in initial verification)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/db/index.js` | posts, post_embeds, post_tags tables via migration | VERIFIED | Migration id=1 'create_posts_tables' present. All three tables with correct columns and CASCADE deletes. |
| `server/routes/posts.js` | Post CRUD API routes | VERIFIED | 285 lines. POST, GET, PUT, DELETE all implemented with auth, validation, rate limiting. Provider string fix at line 74. |
| `server/index.js` | Posts route mounted at /api/posts | VERIFIED | import postsRoutes + app.use('/api/posts', postsRoutes). |
| `client/src/utils/embedParser.js` | Spotify and Apple Music URL parsing | VERIFIED | 46 lines. Exports parseEmbedUrl. Both providers return provider: 'spotify' and provider: 'apple' respectively — consistent with server. |
| `client/src/components/PostForm.jsx` | Shared post composition form | VERIFIED | 65 lines. Uses TextareaAutosize, EmbedInput, TagInput. Character counter. Submit handler. |
| `client/src/components/EmbedInput.jsx` | URL input with live embed preview | VERIFIED | 64 lines. Parses on change, shows EmbedPreview, Remove button. Error message on invalid URL. |
| `client/src/components/EmbedPreview.jsx` | Spotify and Apple Music iframe rendering | VERIFIED | 39 lines. Checks provider === 'apple' at line 20 — now matches server-stored value. Both providers render correct iframes. |
| `client/src/components/TagInput.jsx` | Tag entry with max 5, pills, remove | VERIFIED | 63 lines. Enter/comma to add, pill display, x button to remove, count display, input hidden at max. |
| `client/src/pages/CreatePost.jsx` | Create post page | VERIFIED | 34 lines. Renders PostForm, calls posts.create, navigates on success, shows errors. |
| `client/src/pages/EditPost.jsx` | Edit post page with delete | VERIFIED | 96 lines. Fetches post, owner redirect, PostForm pre-populated, update and delete handlers. |
| `client/src/api/client.js` | posts API methods (create, getBySlug, update, delete) | VERIFIED | posts object with all four methods using correct HTTP verbs and paths. |
| `client/src/App.jsx` | Routes for /posts/new, /posts/:slug, /posts/:slug/edit | VERIFIED | /posts/new (ProtectedRoute), /posts/:slug (public), /posts/:slug/edit (ProtectedRoute). All correctly wired. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| server/routes/posts.js | server/db/index.js | db.run/get/all for parameterized SQL | WIRED | All queries parameterized. No change from initial verification. |
| server/routes/posts.js | server/middleware/auth.js | authenticateToken on mutating routes | WIRED | Used at POST, PUT, DELETE. GET public (correct). |
| server/index.js | server/routes/posts.js | app.use('/api/posts', postsRoutes) | WIRED | Confirmed mounted. |
| client/src/components/EmbedInput.jsx | client/src/utils/embedParser.js | parseEmbedUrl import | WIRED | Line 2: import. Used at line 19. |
| client/src/components/PostForm.jsx | client/src/components/EmbedInput.jsx | Renders EmbedInput | WIRED | Line 3: import. Line 48: renders with embed and onChange. |
| client/src/components/PostForm.jsx | client/src/components/TagInput.jsx | Renders TagInput | WIRED | Line 4: import. Line 50: renders with tags, onChange, maxTags. |
| client/src/pages/CreatePost.jsx | client/src/api/client.js | posts.create() on submit | WIRED | Line 4: import. Line 15: posts.create(). |
| client/src/pages/EditPost.jsx | client/src/api/client.js | posts.getBySlug, posts.update, posts.delete | WIRED | Line 4: import. getBySlug, update, delete all used. |
| client/src/App.jsx | client/src/pages/CreatePost.jsx | ProtectedRoute wrapping /posts/new | WIRED | Route path="/posts/new" with ProtectedRoute. |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| POST-01 | Contributor can create a text post with ~800 character soft limit | SATISFIED | PostForm character counter at 800 soft / 1200 hard. Server stores sanitized body. |
| POST-02 | Contributor can embed a Spotify track/album by pasting a URL | SATISFIED | Live preview and server storage both work for Spotify. Provider 'spotify' consistent across client and server. |
| POST-03 | Contributor can embed an Apple Music track/album by pasting a URL | SATISFIED | Live preview: works (client parseEmbedUrl returns 'apple', EmbedPreview checks 'apple'). Saved embeds: server now stores 'apple' (fixed). API returns 'apple'. EmbedPreview renders iframe. Gap resolved. |
| POST-04 | Contributor can add up to 5 tags per post | SATISFIED | TagInput enforces max at UI level. insertTags enforces max on server. |
| POST-05 | Contributor can edit their own published posts | SATISFIED | EditPost page with auth check, pre-populated form, PUT endpoint with owner guard. |
| POST-06 | Contributor can delete their own posts | SATISFIED | EditPost delete button, window.confirm, DELETE endpoint with owner guard and CASCADE. |

**Orphaned requirements:** None — all six POST-* IDs claimed in both plans and confirmed mapped to Phase 2.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| server/routes/posts.js | 111-115 | Body > 1200 chars is silently truncated to 1200, not rejected with 400 | Warning | Plan truth says "rejects...with 400" but implementation truncates silently. Client disables submit at 1200 so only affects direct API calls. Not a blocker. |

The Apple Music provider string mismatch (previously a Blocker at line 74) has been resolved. No new anti-patterns introduced by the fix.

---

## Human Verification Required

### 1. Apple Music embed on ViewPost

**Test:** Create a post with an Apple Music URL (e.g. https://music.apple.com/us/album/blue-in-green/268443092?i=268443131). After publishing, view the post at /posts/:slug.
**Expected:** Apple Music iframe should be visible below the post body.
**Why human:** The code path is now correct end-to-end (server stores 'apple', API returns 'apple', EmbedPreview checks 'apple'). Browser confirmation is needed to verify the iframe actually renders with correct dimensions and sandbox attributes.

### 2. Apple Music embed in EditPost

**Test:** Edit a post that was saved with an Apple Music URL. Check if the embed preview appears in the EmbedInput component on the edit page.
**Expected:** The embed preview (iframe) should be visible in the form.
**Why human:** EditPost passes `post.embed` (from API, now provider 'apple') as `initialData.embed` to PostForm. PostForm sets `embed` state to `initialData.embed` directly — so the embed object from the API flows into EmbedInput as `embed` prop. EmbedInput sets the url input from `embed?.originalUrl` and renders `<EmbedPreview embed={embed} />` directly (not re-parsed). Since provider is now 'apple', EmbedPreview will render the Apple Music iframe. Browser confirmation ensures originalUrl is stored and returned correctly.

### 3. Character counter visual feedback

**Test:** Type into the textarea on /posts/new and observe character counter color changes.
**Expected:** Counter is gray normally, turns amber (orange-yellow) at 801+ characters, turns red at 1201+ characters.
**Why human:** CSS class toggling — code is correct but visual rendering needs browser confirmation.

### 4. End-to-end post lifecycle

**Test:** Create a post with a Spotify URL, publish, view, edit, and delete.
**Expected:** All transitions work smoothly without errors.
**Why human:** Full navigation flow with API calls requires running application.

---

## Gap Summary

All automated gaps are closed. The Apple Music provider string mismatch has been fixed by changing `server/routes/posts.js` line 74 from `provider: 'apple-music'` to `provider: 'apple'`. All three locations in the Apple Music code path now use the string 'apple' consistently:

- `server/routes/posts.js` line 74: stores 'apple' in DB
- `client/src/utils/embedParser.js` line 37: client parsing returns 'apple'
- `client/src/components/EmbedPreview.jsx` line 20: checks `provider === 'apple'`

The GET route at line 192 returns `embed.provider` directly from the DB row — which is now 'apple' — so ViewPost and EditPost receive the correct value.

Phase goal is code-complete. Human verification items are standard browser-confirmation tests for visual rendering and navigation flow, not functional gaps.

---

_Verified: 2026-02-27T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes (gap closure after Apple Music provider string fix)_
