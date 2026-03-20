# Roadmap: Involuntary Response

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-02-28)
- ✅ **v2.0 Polish & Gaps** -- Phases 6-9 (shipped 2026-02-28)
- ✅ **v2.1 Reader Engagement & Editorial** -- Phases 10-14 (shipped 2026-03-01)
- ✅ **v3.0 Hardening** -- Phases 15-17 (shipped 2026-03-19)
- ✅ **v3.1 Scheduled Posts** -- Phases 18-19 (shipped 2026-03-20)
- ✅ **v4.0 Analytics & Mobile** -- Phases 20-22 (shipped 2026-03-20)

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

<details>
<summary>v3.0 Hardening (Phases 15-17) -- SHIPPED 2026-03-19</summary>

- [x] Phase 15: Server Auth & Security (2/2 plans) -- completed 2026-03-19
- [x] Phase 16: Client Auth Integration (1/1 plan) -- completed 2026-03-19
- [x] Phase 17: Client Robustness & UX (1/1 plan) -- completed 2026-03-19

Full details: `.planning/milestones/v3.0-ROADMAP.md`

</details>

<details>
<summary>v3.1 Scheduled Posts (Phases 18-19) -- SHIPPED 2026-03-20</summary>

- [x] Phase 18: Scheduling Backend (2/2 plans) -- completed 2026-03-19
- [x] Phase 19: Scheduling UI (2/2 plans) -- completed 2026-03-19

Full details: `.planning/milestones/v3.1-ROADMAP.md`

</details>

<details>
<summary>v4.0 Analytics & Mobile (Phases 20-22) -- SHIPPED 2026-03-20</summary>

- [x] Phase 20: Contributor Analytics (2/2 plans) -- completed 2026-03-20
- [x] Phase 21: Admin Analytics (2/2 plans) -- completed 2026-03-20
- [x] Phase 22: Mobile UX (1/1 plan) -- completed 2026-03-20

Full details: `.planning/milestones/v4.0-ROADMAP.md`

</details>

### v4.1 Launch (In Progress)

**Milestone Goal:** Make the site ready for public sharing -- hero section on home page, dedicated /about page, deploy latest code to production.

- [ ] **Phase 23: Hero & About Page** - Hero section on home page and dedicated /about route
- [ ] **Phase 24: Production Deployment** - Deploy v3.0-v4.1 code to Vercel and Render

## Phase Details

### Phase 23: Hero & About Page
**Goal**: First-time visitors immediately understand what the site is and can learn more if they want to
**Depends on**: Phase 22
**Requirements**: LNCH-01, LNCH-02, LNCH-03, LNCH-04, LNCH-05, LNCH-06
**Success Criteria** (what must be TRUE):
  1. Home page opens with a short hero section that communicates what Involuntary Response is, followed immediately by the post feed with no extra clicks
  2. Hero section contains a visible link to /about for visitors who want to learn more
  3. /about page exists with a route in the app, explaining the site's purpose in an editorial (not corporate) voice
  4. /about page describes who is behind the site
  5. /about page has clear calls to action: a link to /join (reader signup) and a link to the RSS feed
**Plans:** 1 plan
Plans:
- [ ] 23-01-PLAN.md — Add hero section to Home page, create About page, add /about route

### Phase 24: Production Deployment
**Goal**: All code from v3.0 through v4.1 is live in production and working
**Depends on**: Phase 23
**Requirements**: LNCH-07, LNCH-08
**Success Criteria** (what must be TRUE):
  1. Vercel frontend build succeeds with no errors and the deployed site loads correctly
  2. API proxy routes on Vercel correctly forward requests to the Render backend
  3. Backend on Render is running the latest server code (scheduling, analytics endpoints respond)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 23 -> 24

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 23. Hero & About Page | v4.1 | 0/1 | Planned | - |
| 24. Production Deployment | v4.1 | 0/? | Not started | - |
