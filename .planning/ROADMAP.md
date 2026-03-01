# Roadmap: Involuntary Response

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-02-28)
- ✅ **v2.0 Polish & Gaps** -- Phases 6-9 (shipped 2026-02-28)
- **v2.1 Reader Engagement & Editorial** -- Phases 10-14 (in progress)

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

### v2.1 Reader Engagement & Editorial (In Progress)

**Milestone Goal:** Add reader participation (likes, comments, lightweight accounts) and contributor editorial tools (drafts, post editing).

- [x] **Phase 10: Schema & Query Safety** - Database migration, status filtering across all public queries, shared helpers extraction (completed 2026-03-01)
- [x] **Phase 11: Reader Accounts** - Lightweight reader signup, role-based auth, contributor route protection (completed 2026-03-01)
- [ ] **Phase 12: Likes** - Post like/unlike toggle, like counts in feed and permalink, liked state for readers
- [ ] **Phase 13: Comments** - Flat top-level comments, chronological display, author/admin/self moderation
- [ ] **Phase 14: Drafts & Post Editing** - Draft save/preview/publish workflow, post editing, edited indicator

## Phase Details

### Phase 10: Schema & Query Safety
**Goal**: The database supports post statuses, likes, and comments -- and no unpublished content can leak into any public surface
**Depends on**: Phase 9 (v2.0 complete)
**Requirements**: None (cross-cutting infrastructure enabling all v2.1 requirements)
**Success Criteria** (what must be TRUE):
  1. All existing posts have `status = 'published'` and `published_at` set to their creation date
  2. A post with `status = 'draft'` inserted directly into the database does NOT appear in the feed, RSS, browse, search, or profile pages
  3. `post_likes` and `post_comments` tables exist and accept inserts
  4. Feed pagination uses `published_at` (not `created_at`) for cursor ordering
  5. A shared `batchLoadPostData` helper exists and is used by all routes that return post lists
**Plans:** 2/2 plans complete
Plans:
- [x] 10-01-PLAN.md -- Migration, shared helper module, requireContributor middleware
- [x] 10-02-PLAN.md -- Status filters and cursor migration across all route files

### Phase 11: Reader Accounts
**Goal**: Anyone can create a reader account and the system correctly distinguishes readers from contributors everywhere
**Depends on**: Phase 10
**Requirements**: ACCT-01, ACCT-02, ACCT-03
**Success Criteria** (what must be TRUE):
  1. A new visitor can sign up with email, display name, and password without an invite code
  2. A reader can log in with their credentials and stay logged in across browser sessions
  3. A logged-in reader sees their display name in the Navbar but does NOT see contributor-only UI (create post, drafts)
  4. A reader's JWT produces 403 (not 201) when hitting `POST /api/posts`
  5. Existing contributor accounts and the invite flow work exactly as before
**Plans:** 2/2 plans complete
Plans:
- [ ] 11-01-PLAN.md -- Reader registration endpoint, requireContributor on mutation routes
- [ ] 11-02-PLAN.md -- JoinPage, ContributorRoute guard, role-aware Navbar, route wiring

### Phase 12: Likes
**Goal**: Readers can express appreciation for posts with a single tap, and like counts are visible to everyone
**Depends on**: Phase 11
**Requirements**: LIKE-01, LIKE-02, LIKE-03
**Success Criteria** (what must be TRUE):
  1. A logged-in reader can like a post and see the heart icon toggle to a filled/active state
  2. The same reader can unlike the post by tapping again, and the heart returns to its default state
  3. Like count is visible on every post in the feed and on the permalink page (even to logged-out visitors)
  4. A logged-in reader browsing the feed sees which posts they have already liked
  5. Liking the same post twice from the same account does not inflate the count (DB constraint enforced)
**Plans:** 1/2 plans executed
Plans:
- [ ] 12-01-PLAN.md -- Server-side like data: extend batchLoadPostData, toggle endpoint, optionalAuth on all routes
- [ ] 12-02-PLAN.md -- LikeButton component, PostCard/PostListItem/ViewPost integration, API client

### Phase 13: Comments
**Goal**: Readers can leave short reactions on posts, and post authors and admins can moderate them
**Depends on**: Phase 12
**Requirements**: CMNT-01, CMNT-02, CMNT-03, CMNT-04
**Success Criteria** (what must be TRUE):
  1. A logged-in reader can write and submit a comment on any post's permalink page
  2. Comments appear in chronological order below the post content with author display name and timestamp
  3. The comment author sees a delete option on their own comment and can remove it
  4. The post's contributor author and any admin see a delete option on ALL comments on that post
  5. A logged-out visitor can read comments but cannot post or delete
**Plans**: TBD

### Phase 14: Drafts & Post Editing
**Goal**: Contributors can save work in progress, preview before publishing, and fix published posts after the fact
**Depends on**: Phase 10 (schema), independent of Phases 11-13
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05
**Success Criteria** (what must be TRUE):
  1. A contributor can save a new post as a draft and find it later in a drafts/my-posts view
  2. A contributor can preview a draft (see it rendered as it would appear publicly) before publishing
  3. A contributor can publish a draft, and it appears at the top of the feed at its publish time (not its creation time)
  4. A contributor can edit a published post's content, embeds, and tags from the post's permalink
  5. An edited post displays a visible "edited" indicator so readers know the content changed after original publication

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 10 -> 11 -> 12 -> 13 -> 14
Note: Phase 14 depends on Phase 10 (not 13) but executes last because reader-facing features are higher priority.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Auth | v1.0 | 3/3 | Complete | 2026-02-27 |
| 2. Post Creation and Embeds | v1.0 | 2/2 | Complete | 2026-02-27 |
| 3. Feed and Post Display | v1.0 | 2/2 | Complete | 2026-02-27 |
| 4. Browse, Discovery, and Profiles | v1.0 | 3/3 | Complete | 2026-02-28 |
| 5. Sharing and Distribution | v1.0 | 2/2 | Complete | 2026-02-28 |
| 6. Deployment and Avatars | v2.0 | 2/2 | Complete | 2026-02-28 |
| 7. Artist Data | v2.0 | 3/3 | Complete | 2026-02-28 |
| 8. Inline References | v2.0 | 1/1 | Complete | 2026-02-28 |
| 9. Full-Text Search | v2.0 | 1/1 | Complete | 2026-02-28 |
| 10. Schema & Query Safety | v2.1 | 2/2 | Complete | 2026-03-01 |
| 11. Reader Accounts | v2.1 | 2/2 | Complete | 2026-03-01 |
| 12. Likes | 1/2 | In Progress|  | - |
| 13. Comments | v2.1 | 0/? | Not started | - |
| 14. Drafts & Post Editing | v2.1 | 0/? | Not started | - |
