---
phase: 15-deployment-wiring
plan: 02
subsystem: infra
tags: [vercel, seo, robots, sitemap, proxy]

# Dependency graph
requires:
  - phase: 06-deployment-config
    provides: "Initial vercel.json with placeholder rewrite rules"
provides:
  - "Vercel API proxy rewrite with configurable backend URL"
  - "robots.txt with crawl directives and sitemap reference"
  - "Static sitemap.xml with 4 public routes"
affects: [16-performance, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Vercel rewrites for API proxy (hardcoded URL, env vars not supported)"]

key-files:
  created:
    - client/public/robots.txt
    - client/public/sitemap.xml
  modified:
    - client/vercel.json

key-decisions:
  - "Used placeholder URLs (YOUR-APP.onrender.com, YOURDOMAIN.com) for find-and-replace before deploy"
  - "Static sitemap only covers 4 routes -- dynamic routes (posts, users, tags, artists) deferred to server-generated sitemap"
  - "Disallow /admin and /api/ paths in robots.txt"

patterns-established:
  - "Placeholder pattern: obvious find-and-replace tokens for deployment-specific values"

requirements-completed: [DEPLOY-01, DEPLOY-04]

# Metrics
duration: 1min
completed: 2026-03-01
---

# Phase 15 Plan 02: Vercel Proxy + SEO Files Summary

**Vercel API proxy rewrite pointed at placeholder Render URL, plus robots.txt and sitemap.xml for search engine discovery**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-01T20:33:19Z
- **Completed:** 2026-03-01T20:33:54Z
- **Tasks:** 2 (1 checkpoint resolved, 1 auto)
- **Files modified:** 3

## Accomplishments
- Replaced literal RENDER_BACKEND_URL placeholder in vercel.json with obvious find-and-replace placeholder (YOUR-APP.onrender.com)
- Created robots.txt allowing all crawlers with Disallow for /admin and /api/ paths
- Created sitemap.xml listing 4 static public routes (/, /explore, /search, /join) in valid XML format

## Task Commits

Each task was committed atomically:

1. **Task 1: Get Render backend URL and production domain** - checkpoint resolved (user chose placeholders)
2. **Task 2: Update vercel.json and create robots.txt + sitemap.xml** - `1666c90` (feat)

## Files Created/Modified
- `client/vercel.json` - API proxy rewrite destination updated from RENDER_BACKEND_URL to YOUR-APP.onrender.com
- `client/public/robots.txt` - Crawl directives: Allow /, Disallow /admin and /api/, Sitemap reference
- `client/public/sitemap.xml` - XML sitemap with 4 static public routes, priority and changefreq set

## Decisions Made
- **Placeholder URLs chosen:** User does not yet have a Render backend URL or production domain. Used `YOUR-APP.onrender.com` and `YOURDOMAIN.com` as obvious find-and-replace tokens. User will update these before deploying.
- **Static sitemap only:** Dynamic routes (/posts/:slug, /u/:username, /tag/:tag, /artist/:name) excluded from static sitemap. Server-generated dynamic sitemap is future work.
- **Disallow /admin and /api/:** Prevents search engines from indexing admin pages and API endpoints.

## Deviations from Plan

None - plan executed exactly as written. The plan's must_haves frontmatter specifies "contains: onrender.com" which the placeholder satisfies.

## Issues Encountered
None.

## User Setup Required

Before deploying, the user must find-and-replace these placeholder values:
- In `client/vercel.json`: Replace `YOUR-APP.onrender.com` with actual Render backend hostname
- In `client/public/robots.txt`: Replace `YOURDOMAIN.com` with actual production domain
- In `client/public/sitemap.xml`: Replace `YOURDOMAIN.com` with actual production domain

## Next Phase Readiness
- Phase 15 (Deployment Wiring) is now complete (2/2 plans done)
- Placeholder URLs must be updated before production deployment
- Ready to proceed to Phase 16

---
*Phase: 15-deployment-wiring*
*Completed: 2026-03-01*
