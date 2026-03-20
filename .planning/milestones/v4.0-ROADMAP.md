# Roadmap: Involuntary Response

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-02-28)
- ✅ **v2.0 Polish & Gaps** -- Phases 6-9 (shipped 2026-02-28)
- ✅ **v2.1 Reader Engagement & Editorial** -- Phases 10-14 (shipped 2026-03-01)
- ✅ **v3.0 Hardening** -- Phases 15-17 (shipped 2026-03-19)
- ✅ **v3.1 Scheduled Posts** -- Phases 18-19 (shipped 2026-03-20)
- 🚧 **v4.0 Analytics & Mobile** -- Phases 20-22 (in progress)

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

### v4.0 Analytics & Mobile (In Progress)

**Milestone Goal:** Contributor analytics dashboard, admin site-wide stats, and mobile UX polish so contributors understand their impact, admins monitor site health, and everyone gets a good experience on small screens.

- [x] **Phase 20: Contributor Analytics** - Stats API and dashboard for contributor post performance and activity (completed 2026-03-20)
- [x] **Phase 21: Admin Analytics** - Site-wide stats API and admin overview page (completed 2026-03-20)
- [x] **Phase 22: Mobile UX** - Hamburger nav, responsive embeds, touch-friendly interactions (completed 2026-03-20)

## Phase Details

### Phase 20: Contributor Analytics
**Goal**: Contributors can see how their posts perform and track their writing activity
**Depends on**: Phase 19 (v3.1 complete)
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05
**Success Criteria** (what must be TRUE):
  1. Contributor can navigate to a stats page from the navbar and see per-post like and comment counts
  2. Contributor can see their posts ranked by most-liked and most-commented
  3. Contributor can see which artists they write about most, with post counts per artist
  4. Contributor can see their total post count, posts this month, and current posting streak
  5. Stats page link only appears for contributors and admins (not readers or logged-out users)
**Plans**: TBD

Plans:
- [ ] 20-01: Analytics API endpoints (contributor stats SQL aggregation)
- [ ] 20-02: Contributor Stats page (React UI consuming analytics API)

### Phase 21: Admin Analytics
**Goal**: Admins can monitor site-wide health and see top contributors and artists across the platform
**Depends on**: Phase 20 (reuses analytics API patterns and shared components)
**Requirements**: ADMN-01, ADMN-02, ADMN-03
**Success Criteria** (what must be TRUE):
  1. Admin can view a site-wide overview showing total posts, likes, comments, contributors, and readers
  2. Admin can see contributors ranked by post count and total engagement (likes + comments)
  3. Admin can see the most-written-about artists across all contributors with post counts
**Plans**: TBD

Plans:
- [ ] 21-01: Admin analytics API endpoints (site-wide SQL aggregation)
- [ ] 21-02: Admin Stats page (React UI consuming admin analytics API)

### Phase 22: Mobile UX
**Goal**: The app works well on mobile screens with proper navigation, touch targets, and responsive embeds
**Depends on**: Nothing (independent of analytics phases)
**Requirements**: MOBL-01, MOBL-02, MOBL-03, MOBL-04
**Success Criteria** (what must be TRUE):
  1. On mobile, contributor and admin navbar links collapse into a hamburger menu icon
  2. Hamburger menu opens and closes with animation, and auto-closes when the user navigates to a new page
  3. All buttons, links, and interactive elements (like, comment, share) are at least 44px touch targets on mobile
  4. Spotify and Apple Music embed iframes scale down on narrow screens without horizontal overflow
**Plans**: 1 plan

Plans:
- [ ] 22-01: Hamburger nav, touch targets, responsive embeds

## Progress

**Execution Order:**
Phase 20 then 21 (sequential -- admin analytics reuses contributor patterns). Phase 22 can run anytime (independent).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 20. Contributor Analytics | 2/2 | Complete    | 2026-03-20 | - |
| 21. Admin Analytics | 2/2 | Complete    | 2026-03-20 | - |
| 22. Mobile UX | 1/1 | Complete    | 2026-03-20 | - |
