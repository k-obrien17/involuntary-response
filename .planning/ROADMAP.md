# Roadmap: Involuntary Response

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-02-28)
- ✅ **v2.0 Polish & Gaps** -- Phases 6-9 (shipped 2026-02-28)
- ✅ **v2.1 Reader Engagement & Editorial** -- Phases 10-14 (shipped 2026-03-01)
- **v3.0 Production Launch** -- Phases 15-19

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) -- SHIPPED 2026-02-28</summary>

- [x] Phase 1: Foundation and Auth (3/3 plans) -- completed 2026-02-27
- [x] Phase 2: Post Creation and Embeds (2/2 plans) -- completed 2026-02-27
- [x] Phase 3: Feed and Post Display (2/2 plans) -- completed 2026-02-27
- [x] Phase 4: Browse, Discovery, and Profiles (3/3 plans) -- completed 2026-02-28
- [x] Phase 5: Sharing and Distribution (2/2 plans) -- completed 2026-02-28

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v2.0 Polish & Gaps (Phases 6-9) -- SHIPPED 2026-02-28</summary>

- [x] Phase 6: Deployment and Avatars (2/2 plans) -- completed 2026-02-28
- [x] Phase 7: Artist Data (3/3 plans) -- completed 2026-02-28
- [x] Phase 8: Inline References (1/1 plan) -- completed 2026-02-28
- [x] Phase 9: Full-Text Search (1/1 plan) -- completed 2026-02-28

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>v2.1 Reader Engagement & Editorial (Phases 10-14) -- SHIPPED 2026-03-01</summary>

- [x] Phase 10: Schema & Query Safety (2/2 plans) -- completed 2026-03-01
- [x] Phase 11: Reader Accounts (2/2 plans) -- completed 2026-03-01
- [x] Phase 12: Likes (2/2 plans) -- completed 2026-03-01
- [x] Phase 13: Comments (2/2 plans) -- completed 2026-03-01
- [x] Phase 14: Drafts & Post Editing (2/2 plans) -- completed 2026-03-01

Full details: `.planning/milestones/v2.1-ROADMAP.md`

</details>

### v3.0 Production Launch

- [x] **Phase 15: Deployment Wiring** - Production env config, admin seed validation, SMTP checks, robots/sitemap (completed 2026-03-01)
- [x] **Phase 16: Social Sharing** - Dynamic OG meta tags for post permalinks and default pages (completed 2026-03-02)
- [ ] **Phase 17: Security Hardening** - Response headers, JWT expiry reduction, CSRF protection
- [ ] **Phase 18: Performance** - Single-post N+1 fix and profile pagination
- [ ] **Phase 19: UX Polish** - 404 page and error states for Search/Explore

## Phase Details

### Phase 15: Deployment Wiring
**Goal**: Production environment is correctly configured and validates its own health on startup
**Depends on**: Phase 14 (v2.1 complete)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. Vercel API proxy routes resolve to the actual Render backend (not a placeholder URL)
  2. Server startup fails with a clear error message if ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_DISPLAY_NAME env vars are missing
  3. Server startup logs a warning and password reset endpoint returns a user-facing error if SMTP env vars are missing
  4. Visiting /robots.txt returns a valid robots file and /sitemap.xml returns a valid sitemap listing public routes
**Plans:** 2/2 plans complete
Plans:
- [ ] 15-01-PLAN.md -- Server startup env validation (admin seed + SMTP checks)
- [ ] 15-02-PLAN.md -- Vercel proxy fix + robots.txt + sitemap.xml

### Phase 16: Social Sharing
**Goal**: Sharing a post link on social platforms shows a rich preview with title, description, and album art
**Depends on**: Phase 15
**Requirements**: SHARE-01, SHARE-02
**Success Criteria** (what must be TRUE):
  1. Pasting a post permalink URL into Twitter/Slack/iMessage renders a card with the post title, a snippet of the take, and album art from the embed
  2. Pasting the homepage, explore page, or profile page URL renders a default OG card with site name and description
  3. Social crawler requests (identified by user-agent) receive server-rendered HTML with OG meta tags, not the SPA shell
**Plans:** 1/1 plans complete
Plans:
- [ ] 16-01-PLAN.md -- Expand OG serverless function + crawler-aware routing + index.html defaults

### Phase 17: Security Hardening
**Goal**: Server responses include industry-standard security headers and auth tokens have reasonable lifetimes
**Depends on**: Phase 15
**Requirements**: SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Every server response includes Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and X-XSS-Protection headers
  2. Newly issued JWT tokens expire after 30 days (not 365)
  3. State-changing endpoints (POST, PUT, DELETE) reject requests without a valid CSRF token
  4. Existing sessions with old JWT expiry continue to work until natural expiration (no forced logout)
**Plans:** 1 plan
Plans:
- [ ] 17-01-PLAN.md -- Security headers (helmet + CSP), JWT 30-day expiry, origin validation

### Phase 18: Performance
**Goal**: Post permalink and profile pages load with minimal database overhead
**Depends on**: Phase 15
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. GET /posts/:slug executes a bounded number of queries regardless of post data (batched, not serial N+1)
  2. Profile pages paginate posts with cursor pagination, loading a fixed page size rather than all posts
  3. Navigating to page 2+ of a profile returns the next batch without re-fetching previous posts
**Plans**: TBD

### Phase 19: UX Polish
**Goal**: Users see helpful feedback when things go wrong instead of blank screens or silent redirects
**Depends on**: Phase 15
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Visiting a URL that does not match any route renders a styled 404 page (not a redirect to home)
  2. The 404 page includes a link back to the homepage
  3. Search and Explore pages display an error message with a retry button when the API request fails
**Plans**: TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-5 | v1.0 | 12/12 | Complete | 2026-02-28 |
| 6-9 | v2.0 | 7/7 | Complete | 2026-02-28 |
| 10-14 | v2.1 | 10/10 | Complete | 2026-03-01 |
| 15. Deployment Wiring | 2/2 | Complete    | 2026-03-01 | - |
| 16. Social Sharing | 1/1 | Complete    | 2026-03-02 | - |
| 17. Security Hardening | v3.0 | 0/1 | Planned | - |
| 18. Performance | v3.0 | 0/? | Not started | - |
| 19. UX Polish | v3.0 | 0/? | Not started | - |
