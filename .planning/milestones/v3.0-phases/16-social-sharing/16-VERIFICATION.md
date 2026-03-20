---
phase: 16-social-sharing
verified: 2026-03-02T00:35:23Z
status: human_needed
score: 3/3 must-haves verified
re_verification: false
human_verification:
  - test: "Paste a post permalink into Slack or Twitter"
    expected: "Card unfurls with the post title (author + embed track name), a snippet of the take body, and album art thumbnail from the embed"
    why_human: "Cannot simulate a real social crawler request without a deployed Vercel environment; the OG function runs server-side and requires the dist/index.html build artifact"
  - test: "Paste the homepage URL (/) into iMessage or Slack"
    expected: "Card shows 'Involuntary Response' as the title and 'Short-form music takes from people who care about music.' as the description"
    why_human: "Same deployment dependency — requires live Vercel to test UA-based routing"
  - test: "Confirm og-default.png exists on the deployed domain"
    expected: "GET /og-default.png returns a real image (used as fallback og:image for all non-post pages and posts without embed thumbnails)"
    why_human: "og-default.png is referenced in og.js as the fallback image path but no og-default.png file exists in client/public/. It will resolve to a broken image URL until the file is created and deployed"
---

# Phase 16: Social Sharing Verification Report

**Phase Goal:** Sharing a post link on social platforms shows a rich preview with title, description, and album art
**Verified:** 2026-03-02T00:35:23Z
**Status:** human_needed — automated checks pass; one runtime gap (missing og-default.png) and live-environment testing required
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sharing a post permalink on Twitter/Slack/iMessage shows the post title, body snippet, and album art thumbnail | VERIFIED (code) | og.js lines 27-66: path matched against `/posts/:slug`, fetches `${RENDER_API_URL}/api/posts/${slug}`, composes `"${displayName} on ${embed.title} | Involuntary Response"`, slices `body` to 200 chars, uses `embed.thumbnailUrl` as og:image |
| 2 | Sharing the homepage or explore URL shows a default card with site name and description | VERIFIED (code) | og.js lines 31-36: default `title = 'Involuntary Response'`, `description = 'Short-form music takes from people who care about music.'` applied to all non-post paths; vercel.json line 5-11 UA rule routes all non-API paths through the function |
| 3 | Social crawlers receive HTML with real OG meta tags, not literal `__OG_TITLE__` placeholder text | VERIFIED (code) | og.js lines 75-79: all five placeholders (`__OG_TITLE__`, `__OG_DESCRIPTION__`, `__OG_IMAGE__`, `__OG_URL__`, `__OG_TYPE__`) replaced via regex before `res.send(html)`. escapeHtml() applied to all substituted values |

**Score:** 3/3 truths verified at the code level

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/api/og.js` | Serverless function returning dynamic OG for posts and default OG for other pages | VERIFIED | 85 lines. Exports default handler. Path-based branching on lines 27-29. Post fetch with 3s timeout on lines 42-44. All five placeholder replacements on lines 75-79. |
| `client/vercel.json` | Rewrite rules routing crawler user-agents through OG function on all paths | VERIFIED | 4 rewrites in correct order: (1) crawler UA conditional -> /api/og, (2) /posts/:slug fallback -> /api/og, (3) API proxy, (4) SPA fallback. Crawler rule confirmed first via index check. |
| `client/index.html` | SPA shell with OG placeholder tags and site_name hardcoded | VERIFIED | Line 8: `__OG_TITLE__`, line 9: `__OG_DESCRIPTION__`, line 10: `__OG_IMAGE__`, line 11: `__OG_TYPE__`, line 12: `__OG_URL__`, line 13: `og:site_name` hardcoded as "Involuntary Response". No hardcoded "article" og:type remains. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `client/vercel.json` | `client/api/og.js` | Crawler UA rewrite: all non-API paths with bot/crawler user-agent -> /api/og | WIRED | Lines 3-12 of vercel.json. `has` condition matches `user-agent` header against 11-bot regex. Source `/((?!api/).*)` excludes /api/* paths. Confirmed first rule in rewrites array. |
| `client/vercel.json` | `client/api/og.js` | Post fallback rewrite: `/posts/:slug` always -> /api/og | WIRED | Line 14: `{ "source": "/posts/:slug", "destination": "/api/og" }`. Ensures post pages always route through OG function even if crawler UA is not in the detection list. |
| `client/api/og.js` | Render backend `/api/posts/:slug` | fetch with 3s timeout for post-specific OG data | WIRED (conditional) | Lines 42-65: `fetch(\`${RENDER_API_URL}/api/posts/${slug}\`, { signal: AbortSignal.timeout(3000) })`. Conditional on `RENDER_API_URL` env var being set. Falls through to site defaults if unset or fetch fails. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SHARE-01 | 16-01-PLAN.md | Post permalink pages render dynamic OG meta tags (title, description, album art) for social crawlers | SATISFIED | og.js constructs `"${displayName} on ${embed.title} | Involuntary Response"` title, slices `body` to 200-char description, uses `embed.thumbnailUrl` for og:image. Response shape from `GET /api/posts/:slug` confirmed to include all three fields (`author.displayName`, `embed.title`, `embed.thumbnailUrl`). |
| SHARE-02 | 16-01-PLAN.md | Default OG tags for non-post pages (homepage, explore, profiles) | SATISFIED | og.js defaults (`title='Involuntary Response'`, `description='Short-form music takes...'`) apply to every path that does not match `/posts/:slug`. Vercel UA rule covers homepage, explore, profile, search, and all other non-API paths. |

No orphaned requirements found. REQUIREMENTS.md traceability table maps SHARE-01 and SHARE-02 to Phase 16, both marked Complete. Both IDs appear in `16-01-PLAN.md` frontmatter `requirements` field.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `client/api/og.js` | 34 | `${SITE_URL}/og-default.png` referenced but `client/public/og-default.png` does not exist | Warning | Default og:image URL resolves to a 404 on deployed frontend. Social platforms will show no image thumbnail for non-post pages and for post pages without an embed thumbnail. The function succeeds and OG tags render — only the image is broken. |

No TODO/FIXME/placeholder comments found in phase files. No empty implementations. No stubs. The `YOUR-APP.onrender.com` placeholder in vercel.json line 15 is a pre-existing gap from Phase 15 (documented in 15-VERIFICATION.md), not introduced by this phase. When `RENDER_API_URL` is unset in the Vercel environment, og.js gracefully falls through to defaults rather than erroring.

---

### Human Verification Required

#### 1. Post permalink social preview

**Test:** Paste a published post permalink (e.g. `https://involuntary-response.vercel.app/posts/abc123`) into Slack or use Twitter Card Validator.
**Expected:** Card shows title in the format `"[Author Name] on [Track Title] | Involuntary Response"`, body snippet (up to 200 chars), and album art image.
**Why human:** Requires a live Vercel deployment with `RENDER_API_URL` env var set to the real Render backend. Cannot simulate a real crawler request or test the UA-conditional rewrite locally.

#### 2. Non-post page default OG card

**Test:** Paste the homepage URL `https://involuntary-response.vercel.app/` into iMessage or LinkedIn.
**Expected:** Card shows "Involuntary Response" as title and "Short-form music takes from people who care about music." as description.
**Why human:** Same deployment dependency — requires live Vercel with crawler UA routing active.

#### 3. og-default.png fallback image

**Test:** Visit `https://involuntary-response.vercel.app/og-default.png` in a browser.
**Expected:** Returns a real image (used as fallback og:image for non-post pages and posts without embed thumbnails).
**Why human:** `og-default.png` is not present in `client/public/` — this file must be created before the default OG image will render. The missing file does not break the OG function itself but produces a broken image in unfurled cards.

---

### Gaps Summary

All three observable truths are verified at the code level. The implementation is complete and substantive:

- The OG serverless function correctly branches on route type, fetches post data with proper timeout and graceful fallback, constructs the expected title/description/image values, replaces all five placeholders, and sets appropriate cache headers.
- `vercel.json` has crawler UA routing as the first rewrite rule with correct source pattern, `has` condition, and destination. The post fallback rule remains as a safety net.
- `index.html` uses `__OG_TYPE__` placeholder (not hardcoded "article"), has `og:site_name` hardcoded, and retains all other placeholder tags.

One warning-level gap exists: `og-default.png` is referenced in `og.js` as the fallback image path but the file does not exist in `client/public/`. This means social cards for non-post pages (and posts without embed thumbnails) will display a broken image. It does not block the OG function from running or the tags from rendering — the og:image tag will be present with a URL, but that URL will 404. This should be resolved before production launch.

Human verification is required for three items: live crawler routing, the post preview card content, and the missing default image file.

---

_Verified: 2026-03-02T00:35:23Z_
_Verifier: Claude (gsd-verifier)_
