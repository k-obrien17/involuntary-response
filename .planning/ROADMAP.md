# Roadmap: Involuntary Response

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-02-28)
- ✅ **v2.0 Polish & Gaps** -- Phases 6-9 (shipped 2026-02-28)
- ✅ **v2.1 Reader Engagement & Editorial** -- Phases 10-14 (shipped 2026-03-01)
- **v3.0 Hardening** -- Phases 15-17 (in progress)

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

### v3.0 Hardening (In Progress)

**Milestone Goal:** Fix all critical/high security and reliability issues from full app audit.

- [x] **Phase 15: Server Auth & Security** - Harden auth middleware, add security headers and rate limiting (completed 2026-03-18)
- [ ] **Phase 16: Client Auth Integration** - Wire client to validate tokens on startup and handle 401s
- [ ] **Phase 17: Client Robustness & UX** - Fix null-safety, race conditions, dead code, and UX rough edges

## Phase Details

### Phase 15: Server Auth & Security
**Goal**: Server enforces real-time auth state and has baseline security protections
**Depends on**: Nothing (first phase of v3.0)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-06, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. A user whose role is changed in the DB is immediately treated with the new role on the next request (no stale JWT roles)
  2. A deactivated user's requests are rejected even if they hold a valid JWT
  3. Requesting `GET /auth/me` with a valid token returns current user data from the database
  4. All responses include security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
  5. An IP sending more than 200 requests per minute receives 429 responses
**Plans**: TBD

### Phase 16: Client Auth Integration
**Goal**: Client validates stored tokens on startup and gracefully handles auth failures
**Depends on**: Phase 15 (requires `/auth/me` endpoint and DB-validated auth)
**Requirements**: AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. On page load, the client validates its stored token against the server and shows current user state (not stale localStorage data)
  2. When a logged-in user's session becomes invalid, they are redirected to `/login` and stale auth state is cleared
**Plans**: TBD

### Phase 17: Client Robustness & UX
**Goal**: Client handles edge cases gracefully and provides proper user feedback
**Depends on**: Phase 15 (server must be stable before client fixes)
**Requirements**: ROBU-01, ROBU-02, ROBU-03, ROBU-04, ROBU-05, ROBU-06, ROBU-07, ROBU-08, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Posts with missing tags or author data render without errors (no white-screen crashes)
  2. Publishing a draft post updates the view without a full page reload
  3. Deleting a post that fails server-side shows an error message to the user instead of silently failing
  4. The `EditPost` page does not flash "unauthorized" before auth context finishes loading
  5. Embed iframes only contain allowlisted attributes (src, width, height, allow, sandbox)
**Plans**: TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-5 | v1.0 | 12/12 | Complete | 2026-02-28 |
| 6-9 | v2.0 | 7/7 | Complete | 2026-02-28 |
| 10-14 | v2.1 | 10/10 | Complete | 2026-03-01 |
| 15. Server Auth & Security | 2/2 | Complete    | 2026-03-19 | - |
| 16. Client Auth Integration | v3.0 | 0/TBD | Not started | - |
| 17. Client Robustness & UX | v3.0 | 0/TBD | Not started | - |
