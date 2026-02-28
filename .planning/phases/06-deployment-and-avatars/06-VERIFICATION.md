---
phase: 06-deployment-and-avatars
verified: 2026-02-28T15:10:00Z
status: human_needed
score: 4/4 must-haves verified
human_verification:
  - test: "Replace RENDER_BACKEND_URL placeholder in client/vercel.json with actual Render service URL before deploying"
    expected: "API calls from the Vercel-hosted frontend reach the Render backend without CORS or 404 errors"
    why_human: "The rewrite destination is a placeholder string (https://RENDER_BACKEND_URL/api/:path*). The file is structurally correct and the rule ordering is valid, but production connectivity cannot be verified without the real URL substituted and a live Vercel deploy."
  - test: "Load a post in the feed (Home page) and confirm a circular avatar appears next to the author name"
    expected: "A circular element (colored initials or Gravatar photo) appears at 24px left of the author name"
    why_human: "Visual rendering of Gravatar image layered over initials background cannot be verified by static analysis"
  - test: "Visit a contributor profile page (/u/:username) and confirm a 64px avatar appears in the profile header"
    expected: "Circular avatar at 64px size with Gravatar (if configured) or initials on colored background"
    why_human: "Visual size and layout verification requires browser rendering"
---

# Phase 6: Deployment and Avatars — Verification Report

**Phase Goal:** Production deployment is fully wired and every contributor has a visible identity on posts and profiles
**Verified:** 2026-02-28T15:10:00Z
**Status:** human_needed — automated checks fully pass; 3 items need human confirmation (1 infrastructure, 2 visual)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Vercel frontend proxies /api/* requests to the Render backend without CORS errors | VERIFIED (structural) | `client/vercel.json` has correct 3-rule rewrite: OG → API proxy → SPA catch-all. Destination is placeholder pending human URL substitution. |
| 2 | Contributor avatar appears next to author name on every post in the feed | ✓ VERIFIED | `PostCard.jsx` imports Avatar and renders `<Avatar emailHash={post.author.emailHash} displayName={post.author.displayName} size={24} />` at line 48. `posts.js` GET / and GET /:slug both select `u.email AS author_email` and map `emailHash: emailHash(p.author_email)` in the author object. |
| 3 | Contributor avatar appears on the post permalink page | ✓ VERIFIED | `ViewPost.jsx` imports Avatar and renders `<Avatar emailHash={post.author?.emailHash} displayName={post.author?.displayName || 'Unknown'} size={28} />` at line 82. Backend single-post route (`GET /:slug`) returns `author.emailHash`. |
| 4 | Contributor profile page displays their avatar | ✓ VERIFIED | `Profile.jsx` imports Avatar and renders `<Avatar emailHash={profileData.emailHash} displayName={profileData.displayName} size={64} />` at line 81. `profile.js` selects `email` in the user query and returns `emailHash: emailHash(user.email)` in the user object. |
| 5 | Contributors without a Gravatar see their initials as a fallback avatar | ✓ VERIFIED | `Avatar.jsx` renders initials on a colored `<div>` (bg from `#${emailHash.slice(0,6)}`), with a Gravatar `<img d=blank>` absolutely positioned on top. The `d=blank` Gravatar parameter returns a transparent PNG when no Gravatar exists, revealing the initials underneath. No `onerror` handling required. |

**Score:** 4/4 truths verified (DEPL-01 truth structurally verified, pending human URL substitution for full production confirmation)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/vercel.json` | API proxy rewrite to Render backend | ✓ VERIFIED | 3 rewrites in correct order: `/posts/:slug` → OG handler, `/api/:path*` → `https://RENDER_BACKEND_URL/api/:path*`, `/(.*)`  → SPA. JSON valid. |
| `client/src/components/Avatar.jsx` | Reusable avatar with Gravatar + initials fallback | ✓ VERIFIED | 55 lines. Exports `Avatar({ emailHash, displayName, size, className })`. Gravatar URL with `d=blank`. Initials from `getInitials()`. Deterministic bg color from hash prefix. |
| `server/routes/posts.js` | emailHash in author response for post list and single post | ✓ VERIFIED | `emailHash` helper at line 10. Both `GET /` and `GET /:slug` select `u.email AS author_email` and map `emailHash: emailHash(p.author_email)` in author objects. |
| `server/routes/profile.js` | emailHash in profile user object and profile posts | ✓ VERIFIED | User query now selects `email`. User response includes `emailHash: emailHash(user.email)`. Post rows select `u.email AS author_email` and map through `emailHash`. |
| `server/routes/browse.js` | emailHash in all 4 browse endpoints | ✓ VERIFIED | `emailHash` helper at line 5. `formatPosts()` centralizes mapping with `emailHash: emailHash(p.author_email)`. All 4 endpoints (`/tag/:tag`, `/artist/:name`, `/contributor/:username`, `/explore`) use this path. Explore contributors list also includes `emailHash`. |
| `client/src/components/PostCard.jsx` | Avatar rendered in feed post footer | ✓ VERIFIED | Line 3: `import Avatar from './Avatar'`. Line 48: `<Avatar emailHash={post.author.emailHash} displayName={post.author.displayName} size={24} />` |
| `client/src/components/PostListItem.jsx` | Avatar rendered in profile post list | ✓ VERIFIED | Line 2: `import Avatar from './Avatar'`. Line 17: `<Avatar emailHash={post.author.emailHash} displayName={post.author.displayName} size={18} />` |
| `client/src/pages/ViewPost.jsx` | Avatar rendered on permalink page | ✓ VERIFIED | Line 6: `import Avatar from '../components/Avatar'`. Line 82: `<Avatar emailHash={post.author?.emailHash} displayName={post.author?.displayName || 'Unknown'} size={28} />` |
| `client/src/pages/Profile.jsx` | Avatar rendered in profile header | ✓ VERIFIED | Line 5: `import Avatar from '../components/Avatar'`. Line 81: `<Avatar emailHash={profileData.emailHash} displayName={profileData.displayName} size={64} />` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `client/vercel.json` | Render backend | Vercel rewrite rule | WIRED (structural) | Rule `/api/:path*` → `https://RENDER_BACKEND_URL/api/:path*` present at index 1 of 3, correct position. Placeholder URL requires human substitution. |
| `server/routes/posts.js` | `client/src/components/Avatar.jsx` | `author.emailHash` in API response | ✓ WIRED | Server maps `emailHash: emailHash(p.author_email)`, client reads `post.author.emailHash` in PostCard and ViewPost. Full end-to-end chain confirmed. |
| `client/src/components/Avatar.jsx` | `https://gravatar.com/avatar/` | Gravatar URL with MD5 hash | ✓ WIRED | Line 19: `` `https://gravatar.com/avatar/${emailHash}?d=blank&s=${size * 2}` `` |
| `client/src/components/PostCard.jsx` | `client/src/components/Avatar.jsx` | import and render | ✓ WIRED | Import at line 3, rendered at line 48 with `emailHash` and `displayName` props |
| `client/src/pages/Profile.jsx` | `client/src/components/Avatar.jsx` | import and render | ✓ WIRED | Import at line 5, rendered at line 81 with `emailHash` and `displayName` props from `profileData` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEPL-01 | 06-01-PLAN.md | `vercel.json` configured with `/api/*` proxy rewrite to Render backend | ✓ SATISFIED | `client/vercel.json` contains correct rewrite rule at index 1. Structural requirement fully met; placeholder URL is the documented intentional state (user setup required). |
| AVTR-01 | 06-02-PLAN.md | Contributor avatar auto-generated from email (Gravatar) with initials fallback | ✓ SATISFIED | `Avatar.jsx` implements Gravatar URL with `d=blank` + initials on colored background. `emailHash` present in all server responses. No raw email exposed. |
| AVTR-02 | 06-02-PLAN.md | Avatar displayed on posts in feed and permalink views | ✓ SATISFIED | `PostCard.jsx` (feed) and `ViewPost.jsx` (permalink) both import and render `<Avatar>` with correct props from API response. |
| AVTR-03 | 06-02-PLAN.md | Avatar displayed on contributor profile page | ✓ SATISFIED | `Profile.jsx` renders `<Avatar emailHash={profileData.emailHash} size={64} />`. `profile.js` returns `emailHash` in the user object. |

**Orphaned requirements check:** `REQUIREMENTS.md` maps DEPL-01, AVTR-01, AVTR-02, AVTR-03 to Phase 6. All 4 are claimed in the plans. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `client/vercel.json` | 4 | `RENDER_BACKEND_URL` placeholder | INFO | Intentional and documented. Production deployment requires user to substitute real Render URL. Not a stub — the rule structure is complete and correct. |
| `client/src/pages/Profile.jsx` | 105 | `placeholder="Write a short bio..."` | INFO | HTML `<textarea>` placeholder attribute. Not a code stub — this is UI helper text for the bio editing textarea. No impact. |

No blocker or warning anti-patterns found.

---

### Human Verification Required

#### 1. Substitute RENDER_BACKEND_URL before deploying

**Test:** Open `client/vercel.json`, replace `https://RENDER_BACKEND_URL` on line 4 with the actual Render service URL (e.g., `https://backyard-marquee-api.onrender.com`), then push to Vercel and make an API call from the production domain.
**Expected:** API calls like `GET /api/posts` return HTTP 200 with post data. No CORS errors in the browser console.
**Why human:** The rewrite destination is a placeholder. The file structure, rule ordering, and path forwarding are all correct, but connectivity to the real backend URL cannot be verified statically.

#### 2. Avatar rendering in the feed

**Test:** Load the home page in a browser. Find any post in the feed and inspect the author byline area.
**Expected:** A circular element (colored initials or Gravatar photo if the contributor has configured one) appears at approximately 24px diameter to the left of the author's display name.
**Why human:** Visual rendering — Gravatar image loading and the initials/Gravatar layering strategy (`d=blank` + `position: absolute`) requires a browser to confirm.

#### 3. Avatar rendering on the profile page

**Test:** Navigate to a contributor profile page (e.g., `/u/someusername`). Inspect the profile header.
**Expected:** A circular avatar at approximately 64px diameter appears in a flex row to the left of the display name and username. If the contributor has a Gravatar, their photo appears; otherwise, colored initials are shown.
**Why human:** Visual size and layout (flex row alignment, 64px render size) requires browser confirmation.

---

### Gaps Summary

No gaps. All 4 requirements (DEPL-01, AVTR-01, AVTR-02, AVTR-03) are structurally satisfied in the codebase. The 3 human verification items are confirmations of correct behavior, not gaps — the implementation is complete.

The `RENDER_BACKEND_URL` placeholder is the documented and expected state per the PLAN and SUMMARY (user must supply the real Render URL). This is a setup step, not a missing implementation.

---

### Commit Verification

All 3 documented commits confirmed present in git log:

| Commit | Description |
|--------|-------------|
| `6383d74` | feat(06-01): add API proxy rewrite to vercel.json |
| `a005e87` | feat(06-02): add email hash to all server-side author responses |
| `a595067` | feat(06-02): create Avatar component and integrate into all views |

---

_Verified: 2026-02-28T15:10:00Z_
_Verifier: Claude (gsd-verifier)_
