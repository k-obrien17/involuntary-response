---
phase: 05-sharing-and-distribution
plan: 01
subsystem: infra
tags: [og-meta, rss, vercel-serverless, social-sharing, feed]

# Dependency graph
requires:
  - phase: 03-post-display-and-feed
    provides: Post permalink routes (GET /api/posts/:slug) and post_embeds table
provides:
  - Vercel serverless function for dynamic OG meta tag injection on /posts/:slug
  - RSS 2.0 feed endpoint at /api/feed with recent posts
  - OG placeholder meta tags in index.html for crawler-friendly sharing
  - RSS autodiscovery link in index.html
affects: [deployment, vercel-config]

# Tech tracking
tech-stack:
  added: [feed (npm)]
  patterns: [vercel-serverless-function, og-placeholder-replacement, rss-batch-query]

key-files:
  created:
    - client/api/og.js
    - server/routes/feed.js
  modified:
    - client/index.html
    - client/vercel.json
    - server/index.js
    - server/package.json

key-decisions:
  - "Vercel serverless function reads built dist/index.html and replaces OG placeholders server-side for crawler compatibility"
  - "RSS feed uses FRONTEND_URL for all item links, pointing to website not API"
  - "OG image falls back to /og-default.png when post has no embed thumbnail"
  - "3-second timeout on API fetch in OG function to prevent slow social preview generation"

patterns-established:
  - "OG placeholder pattern: __OG_TITLE__ etc in index.html replaced at request time by serverless function"
  - "Vercel rewrite ordering: specific routes before SPA catch-all"

requirements-completed: [SHAR-02, SHAR-03]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 5 Plan 1: Social Sharing and RSS Summary

**Vercel serverless OG meta tag injection for social preview cards and RSS 2.0 feed endpoint using feed npm package**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T04:42:01Z
- **Completed:** 2026-02-28T04:43:44Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Post permalink URLs now render rich social preview cards (title, description, album artwork) when shared on Twitter, Slack, or iMessage
- RSS feed at /api/feed returns valid RSS 2.0 XML with the 20 most recent posts, each linking to frontend permalinks
- OG tags gracefully fall back to site defaults when API is unreachable or post has no embed thumbnail
- HTML entity escaping prevents XSS in meta tag attribute values

## Task Commits

Each task was committed atomically:

1. **Task 1: OG meta tags via Vercel serverless function** - `5ef18c3` (feat)
2. **Task 2: RSS feed Express endpoint** - `6956714` (feat)

## Files Created/Modified
- `client/index.html` - Added OG/Twitter Card placeholder meta tags and RSS autodiscovery link
- `client/api/og.js` - Vercel serverless function that fetches post data from Render API and replaces OG placeholders
- `client/vercel.json` - Added /posts/:slug rewrite to serverless function before SPA catch-all
- `server/routes/feed.js` - RSS 2.0 feed endpoint with batch embed queries
- `server/index.js` - Mounted feed route at /api/feed
- `server/package.json` - Added feed npm dependency

## Decisions Made
- Used Vercel serverless function (not SSR or react-helmet) because social crawlers do not execute JavaScript
- RSS feed uses batch IN() query for embeds to avoid N+1, consistent with existing browse/feed patterns
- Feed items use FRONTEND_URL for links (points to website, not API server)
- 3-second AbortSignal timeout on API fetch in OG function to prevent slow preview generation
- Module-level HTML caching in og.js for warm Vercel function starts

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration:**

1. **Vercel environment variables** (required for OG tags to work in production):
   - `RENDER_API_URL` - Your Render API service URL (e.g., `https://involuntary-response-api.onrender.com`)
   - `SITE_URL` - Your Vercel frontend domain (e.g., `https://involuntary-response.vercel.app`)

2. **Default OG image** (recommended):
   - Provide a `client/public/og-default.png` image (1200x630 pixels) with site branding
   - This is used as fallback when a post has no embed thumbnail

## Issues Encountered
None

## Next Phase Readiness
- OG tags and RSS feed are ready for deployment
- After deploying, verify with: `curl -s https://involuntary-response.vercel.app/posts/{slug} | grep og:title`
- RSS feed verifiable locally: `curl -s http://localhost:3001/api/feed | head -5`

## Self-Check: PASSED

All 5 created/modified files verified on disk. Both task commits (5ef18c3, 6956714) verified in git log.

---
*Phase: 05-sharing-and-distribution*
*Completed: 2026-02-28*
