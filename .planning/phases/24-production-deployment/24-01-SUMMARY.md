---
phase: 24-production-deployment
plan: 01
subsystem: infra
tags: [vercel, render, turso, deployment, seo]

# Dependency graph
requires:
  - phase: 23-hero-about-page
    provides: Final client-side content (hero + /about) needed before public launch
provides:
  - Production-wired vercel.json rewriting /api/* to involuntary-response-api.onrender.com
  - robots.txt and sitemap.xml pointing at involuntary-response.vercel.app
  - Verified live stack: Vercel frontend + Render API + Turso DB
affects: [post-launch, monitoring, custom-domain]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vercel rewrites proxy /api/* to Render backend (no CORS at browser layer)"

key-files:
  created: []
  modified:
    - client/vercel.json
    - client/public/robots.txt
    - client/public/sitemap.xml

key-decisions:
  - "Used default Vercel subdomain (involuntary-response.vercel.app) for launch; custom domain deferred"
  - "Render hostname is involuntary-response-api.onrender.com"

patterns-established:
  - "Deployment URL source of truth: vercel.json for API proxy, robots.txt + sitemap.xml for public domain"

requirements-completed: [LNCH-07, LNCH-08]

# Metrics
duration: ~15min
completed: 2026-04-15
---

# Phase 24 Plan 01: Production Deployment Summary

**Replaced deployment URL placeholders and verified Vercel + Render + Turso stack is live at involuntary-response.vercel.app.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-04-15
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Wired vercel.json API proxy to real Render backend hostname
- Updated robots.txt and sitemap.xml to real Vercel frontend domain
- Confirmed live: /api/health returns 200, frontend loads, user visually verified

## Task Commits

1. **Task 1: Collect deployment URLs (decision checkpoint)** — resolved via user input (Render: involuntary-response-api.onrender.com; Frontend: involuntary-response.vercel.app)
2. **Task 2: Update placeholder URLs in config files** — `2d886f4` (chore)
3. **Task 3: Verify production deployment (human-verify checkpoint)** — resolved via live curl + user visual confirmation

**Related commits in same session:**
- `2a835e9` — fix(security): render oEmbed iframe via React instead of dangerouslySetInnerHTML
- `8541c49` — docs: rewrite CLAUDE.md to reflect current architecture

## Files Created/Modified
- `client/vercel.json` — API proxy rewrite destination set to involuntary-response-api.onrender.com
- `client/public/robots.txt` — Sitemap URL set to involuntary-response.vercel.app
- `client/public/sitemap.xml` — All 4 URLs set to involuntary-response.vercel.app

## Decisions Made
- Launched on default Vercel subdomain; custom domain can swap in later with a one-line update to robots.txt/sitemap.xml and adding it in the Vercel dashboard.

## Deviations from Plan

None — plan executed exactly as written. Two adjacent commits (`2a835e9` security fix, `8541c49` CLAUDE.md rewrite) rode along but are orthogonal to this plan's scope.

## Issues Encountered
None.

## Next Phase Readiness
- v4.1 Launch milestone complete. All code from v3.0 through v4.1 is live.
- Follow-ups (not blocking): custom domain, og-default.png creation, Spotify credentials in server/.env.

---
*Phase: 24-production-deployment*
*Completed: 2026-04-15*
