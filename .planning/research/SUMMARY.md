# Project Research Summary

**Project:** Involuntary Response v2.1 — Reader Engagement & Editorial
**Domain:** Adding reader participation and contributor editorial tools to an existing music micro-blogging platform
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

Involuntary Response v2.1 adds two independent feature groups to an already-working Express/Turso/React platform: reader accounts with engagement features (likes and comments), and contributor editorial tools (drafts, scheduled publishing, and post editing UI). Research confirms that nearly everything needed already exists in the codebase — the same JWT/bcrypt auth, rate limiting, sanitization, and toggle-like/flat-comment patterns proven in the Backyard Marquee side of the same monorepo can be directly reused here. The only new infrastructure dependency is `node-cron@3.0.3` for scheduled publishing, and four database migrations for new tables and columns. This is a low-risk, high-confidence build grounded entirely in existing patterns.

The recommended approach treats the two feature groups as sequentially ordered but internally parallel: reader accounts must exist before likes and comments work, and the post status schema must be in place before drafts or scheduling can function. The architecture research derives a clear 6-phase build order driven by hard dependency constraints — starting with schema and status filtering (a cross-cutting safety concern), then reader accounts, then engagement features (likes first, comments second), then contributor editorial tools (drafts, then scheduling). This order ensures the system is always in a releasable state at the end of each phase.

The dominant risk is not technical complexity — it is the scope of the status filter change. Adding `status = 'published'` to the `posts` schema is a one-line migration, but that filter must be applied to at least 10 distinct query sites across 5 route files plus the RSS feed. Missing any one of them causes unpublished content to leak publicly — in the feed, in RSS, in search results, in browse-by-tag results. Ghost CMS had exactly this bug in production (GitHub issue #11266). Prevention requires a systematic query audit before any code is written. All other pitfalls (role confusion, N+1 queries, scheduler persistence, cursor pagination breakage) are well-understood with clear prevention strategies.

## Key Findings

### Recommended Stack

The existing stack handles everything. No new client-side dependencies are needed. The only server addition is `node-cron@3.0.3` for scheduled post publishing. All auth, rate limiting, sanitization, bcrypt hashing, JWT generation, and database access patterns remain unchanged.

**Core technologies (unchanged):**
- **React 18 + Vite 5 + Tailwind 3 + React Router 6 + Axios**: Existing frontend stack, no changes
- **Express 5 + Node.js**: Existing API server, existing middleware patterns extended not replaced
- **Turso (@libsql/client)**: Existing database, append-only migration pattern, 4 new migrations

**New dependency (server only):**
- **node-cron@3.0.3**: In-process scheduled task runner — recommended over Render Cron Jobs (extra cost, separate deployment) and `node-schedule` (more complex API, wrong tool for a repeating poller). Alternatively, a simple `setInterval` with startup catch-up achieves the same result with zero new dependencies.

**Schema additions (no new libraries):**
- `posts.status TEXT DEFAULT 'published'` — values: `draft`, `published`, `scheduled`
- `posts.published_at DATETIME` — set on publish, used for feed ordering (not `created_at`)
- `post_likes` table — composite PK `(post_id, user_id)`, identical pattern to `lineup_likes`
- `post_comments` table — flat only (no `parent_id`), identical pattern to `lineup_comments`

**What NOT to add:** DOMPurify (existing `sanitize()` covers plain text), WebSockets, React Query, social login for readers, autosave, or profanity filters. The existing stack handles all of these at this platform's scale.

### Expected Features

See [FEATURES.md](FEATURES.md) for the full prioritization matrix and competitor analysis.

**Must have (table stakes — P1):**
- Reader signup (email + password + display name, no invite token) — identity required before any engagement is possible
- Post likes (toggle, one per reader per post, count visible to all) — universal engagement signal
- Flat top-level comments — standard reader feedback mechanism; flat only per project scope
- Contributor post editing UI — backend PUT route already exists; frontend edit button is the missing piece
- Draft save (unpublished posts) — every publishing platform distinguishes draft from published

**Should have (differentiators — P2):**
- Scheduled publishing with datetime picker — Substack and Ghost both offer this; editorial cadence value
- "My Posts" contributor dashboard — published/draft/scheduled views; significantly improves contributor UX
- Like count + comment count in feed — makes the platform feel alive, guides reader attention
- Reader liked-state in feed (when logged in) — prevents re-liking confusion, shows participation
- "Edited" indicator on posts — transparency when content changes after publish

**Defer to v2.2+:**
- Email notifications for likes/comments — infrastructure overhead not justified at current contributor count
- Reader profile pages — readers are consumers; display name on comments is sufficient
- Social login (Google/GitHub) for readers — add only if signup friction is measured to be a problem
- Comment editing — delete and re-post; 500-char comments are not polished content
- Autosave drafts — posts are ~800 chars; manual save is fine; losing a draft is 2 minutes of work
- Version history for edits — show "edited" badge with timestamp, no full diff needed

### Architecture Approach

All new features integrate into the existing Express/middleware/Turso stack without introducing new architectural layers. The integration surface is wide (10 query sites, 5 route files, multiple client components) but each individual change is small and additive. The single most important structural recommendation from the architecture research is extracting the existing `batchLoadPostData` helper from `browse.js` into a shared `server/lib/post-helpers.js` module, so like and comment count batch-loading is written once and imported across all 4 places that need it.

**Major new components:**
1. `server/lib/scheduler.js` (NEW): `setInterval` polling every 60 seconds to flip `scheduled` posts to `published` when `publish_at <= now`; runs immediately on startup to catch missed publishes from process restarts
2. `server/lib/post-helpers.js` (NEW): Extracted `batchLoadPostData` + `formatPosts` helpers extended with like/comment counts — imported by `posts.js`, `browse.js`, `profile.js`, `search.js` to eliminate N+1 query risk
3. `middleware/auth.js` + `requireContributor` (MODIFIED): New export that wraps `authenticateToken` and checks `req.user.role`; protects post create/update routes from reader access
4. `client/src/components/LikeButton.jsx` (NEW): Heart icon + count + toggle with optimistic update
5. `client/src/components/CommentSection.jsx` (NEW): Comment list + add form + delete; reader auth required; author/admin/self moderation
6. `client/src/pages/Drafts.jsx` (NEW): Contributor's draft and scheduled post management view
7. `client/src/components/ContributorRoute.jsx` (NEW): Route guard requiring contributor or admin role

**New routes summary:**
- `POST /api/auth/register-reader` — open reader signup, separate from invite-protected contributor registration
- `GET /api/posts/drafts` — contributor's own drafts and scheduled posts
- `POST /api/posts/:slug/like` and `DELETE /api/posts/:slug/like` — toggle like
- `GET /api/posts/:slug/comments`, `POST /api/posts/:slug/comments`, `DELETE /api/posts/:slug/comments/:id` — comment CRUD

### Critical Pitfalls

See [PITFALLS.md](PITFALLS.md) for the full pitfall-to-phase mapping, security mistakes, UX pitfalls, and recovery strategies.

1. **Draft/scheduled posts leaking into public queries** — Before writing any code, enumerate all 10 query sites across `posts.js`, `browse.js`, `feed.js`, `search.js`, `profile.js`. Add `AND p.status = 'published'` to every one. The RSS feed (`feed.js`) is the most commonly missed location. Single-post GET requires special handling: show drafts only to their author via `optionalAuth`.

2. **AuthContext assuming a single user type** — Audit every `if (user)` check in the frontend before reader registration is built. Add explicit `isContributor`, `isReader`, `isAdmin` helpers to `AuthContext`. Add `requireContributor` middleware server-side. A reader's JWT must produce 403 from `POST /api/posts`, not 201.

3. **Reader registration conflicting with the invite flow** — Use a separate `/register-reader` endpoint; do not touch the existing `/register` endpoint. Change the `role` column default from `'contributor'` to `'reader'` (or remove the default entirely). The current default becomes a security hole the moment open registration exists.

4. **Cursor pagination breaking on status change** — Add a `published_at` column in the same migration as `status`. Change all public feed cursors to use `(published_at, id)` instead of `(created_at, id)`. A scheduled post that publishes must appear at the top of the feed at its publish time, not buried at its draft creation date.

5. **N+1 queries on like/comment counts** — Follow the existing `batchLoadPostData` pattern in `browse.js`. A single `GROUP BY post_id` query for likes and one for comments replaces N per-post subqueries. With 20 posts per page, this is 40 queries vs. 2 — a correctness issue even at small scale.

6. **Scheduled publishing silent failures** — `node-cron` schedules exist only in process memory. If the Render process restarts, scheduled posts miss their window. Solution: make the scheduler stateless. The database IS the schedule (`publish_at` column). The scheduler just runs `UPDATE ... WHERE status = 'scheduled' AND publish_at <= NOW()` — this query is safe to run repeatedly, and running it on startup catches any missed publishes from downtime.

## Implications for Roadmap

The dependency graph is clear and suggests 6 phases. Reader engagement (Phases 2-4) and editorial tools (Phases 5-6) are fully independent of each other after Phase 1 and could be parallelized. The sequential ordering below is correct for a solo developer and leaves the system in a working state after each phase.

### Phase 1: Schema Foundation + Status Filtering

**Rationale:** Cross-cutting safety concern that must come first. The `status` and `published_at` columns must exist before any draft feature is built. The status filter must be applied to all public queries before any draft can be created — otherwise any draft saved in Phase 5 would immediately appear in public feeds, RSS, and search. This phase sets up the safety net for the entire remaining build.

**Delivers:** Single database migration (posts.status, posts.published_at, post_likes, post_comments tables); `requireContributor` middleware export; `batchLoadPostData` extracted to `server/lib/post-helpers.js`; `AND p.status = 'published'` filter applied to all 10 public query sites

**Addresses:** Query audit across posts.js, browse.js, feed.js, search.js, profile.js

**Avoids:** Draft leak (Pitfall 1), cursor pagination breakage (Pitfall 4), N+1 setup (Pitfall 5)

**Research flag:** Standard patterns — pure migration and query modification. No additional research needed.

### Phase 2: Reader Accounts

**Rationale:** Likes and comments require authenticated reader identity. Reader accounts must exist before any engagement feature is built or tested. The role model — and all its client-side and server-side guards — must be established before any code assumes user type.

**Delivers:** `POST /api/auth/register-reader` endpoint; `ReaderRegister.jsx` page; `AuthContext` role helpers (`isContributor`, `isReader`, `isAdmin`); `ContributorRoute.jsx` guard; Navbar conditional rendering; role enforcement on all contributor-only routes; `role` column default changed to `'reader'`

**Addresses:** Reader signup (P1 table stake), role-based UI gating, security audit of all `if (user)` checks

**Avoids:** AuthContext single-user-type assumption (Pitfall 2), reader registration conflicting with invite flow (Pitfall 3 / security section)

**Research flag:** Standard patterns — direct reuse of existing auth route. No additional research needed.

### Phase 3: Likes

**Rationale:** Simplest engagement feature. Proves the reader auth flow works end-to-end in a real use case before tackling the more complex comments system. High user value at lowest implementation cost. The `post_likes` table already exists from Phase 1.

**Delivers:** `POST/DELETE /api/posts/:slug/like` toggle endpoints; `LikeButton.jsx` component on `ViewPost`; batch-loaded like counts in feed/browse/search/profile via the shared `post-helpers.js`; `likedByMe` boolean for authenticated readers on single post view via `optionalAuth`

**Addresses:** Post likes P1 feature, like count in feed P1/P2 feature

**Avoids:** N+1 query explosion (Pitfall 5) — batch-loading required from the start; like count inflation — UNIQUE constraint on `(user_id, post_id)` enforced at DB level

**Research flag:** Standard patterns — direct reuse of `lineup_likes` from Backyard Marquee. Validate Turso `INSERT OR IGNORE` behavior in staging before shipping (known edge case with transactions in Turso #2713).

### Phase 4: Comments

**Rationale:** More complex than likes — text input, sanitization, display list, moderation, delete permissions for three parties (comment author, post author, admin). Builds on reader auth proven in Phase 3. The `post_comments` table already exists from Phase 1.

**Delivers:** `GET/POST/DELETE /api/posts/:slug/comments` endpoints; `CommentSection.jsx` component on `ViewPost`; comment count in feed via `post-helpers.js`; post author + admin + comment author delete permissions; rate limiting (20 comments per 15 min); 500-char limit with existing `sanitize()` function

**Addresses:** Post comments P1 feature, comment moderation, comment count in feed

**Avoids:** Comment spam — rate limiting + auth required + account age minimum (add 5-min account age check as a 3-line addition to the comment creation route); missing HTML sanitization; missing post author moderation capability

**Research flag:** Standard patterns — direct reuse of `lineup_comments` from Backyard Marquee. No additional research needed.

### Phase 5: Drafts + Post Editing

**Rationale:** Only affects contributors, fully independent of Phases 2-4. The schema (status column, published_at) is already in place from Phase 1. The backend PUT route already exists and is implemented. This phase is primarily about surfacing status management in the UI, adding the draft listing endpoint, and ensuring `published_at` is set correctly when status transitions to `published`.

**Delivers:** `GET /api/posts/drafts` endpoint; `PostForm.jsx` status selector (draft/publish); `Drafts.jsx` contributor dashboard page; draft preview via `optionalAuth` on `GET /:slug` (author sees their own drafts); publish-from-draft action; "edited" indicator when `updated_at > published_at`; `published_at` set on publish transition (ensures correct feed ordering from Phase 1's cursor logic)

**Addresses:** Draft save P1 feature, draft preview P1, publish from draft P1, post edit UI P1, "My Posts" dashboard P2, edited indicator P2

**Avoids:** Draft slug accessible to public without auth (security); scheduled post appearing deep in feed rather than at top (cursor uses `published_at` from Phase 1)

**Research flag:** Standard patterns — well-understood CMS workflow (WordPress, Ghost, Payload CMS all document this). No additional research needed.

### Phase 6: Scheduled Publishing

**Rationale:** Scheduling is drafts with a future `publish_at` date. Entirely dependent on the draft/status system from Phase 5. Smallest scope of all phases: a datetime picker in the form, the scheduler module, and the scheduled post display in the contributor dashboard.

**Delivers:** `server/lib/scheduler.js` with immediate startup catch-up + 60-second polling interval; datetime picker in `PostForm.jsx`; scheduled post display with `publish_at` time in `Drafts.jsx`; `publish_at` column already exists from Phase 1 migration

**Addresses:** Scheduled publishing P2 feature, "Scheduled for [date]" badge in contributor view, cancel/reschedule from dashboard

**Avoids:** Scheduler silent failures on process restart (Pitfall 6) — stateless poll approach with startup catch-up; scheduled post missing its window by >60 seconds

**Research flag:** Low complexity. Validate Render's process restart behavior to confirm `setInterval` catch-up is sufficient. If restarts are more frequent than expected, add the poll-on-request pattern (run the publish check inside the feed request handler) as a secondary mechanism with no infrastructure cost.

### Phase Ordering Rationale

- Phase 1 must be first: the status filter is a security/correctness concern that applies to every subsequent phase. Any draft created before this filter is in place would be publicly visible.
- Phases 2-4 follow strict dependency order: accounts enable engagement, and likes are simpler than comments (proving reader auth flow before tackling moderation complexity).
- Phases 5-6 (editorial tools) are fully independent of Phases 2-4 and could be built in parallel. In a solo build, they follow Phase 4 because they depend on Phase 1 schema and are lower urgency than reader-facing features.
- All schema changes are batched into a single Phase 1 migration. This is intentional: Turso's ALTER TABLE is available but multiple migrations that alter the same table are more fragile than one comprehensive migration.
- The `batchLoadPostData` extraction in Phase 1 prevents the N+1 pattern from being established in Phases 3 and 4. Extracting it after would require refactoring 4 files simultaneously.

### Research Flags

All 6 phases use well-documented patterns grounded in code that already runs in production. No phase requires a research spike before implementation planning.

**Validate during implementation (not blocking):**
- **Phase 3 (Likes):** Test Turso `INSERT OR IGNORE` behavior in a staging environment. A known issue (#2713) affects this pattern in certain transaction contexts. The existing `lineup_likes` uses this pattern — if it works in production there, it will work here too.
- **Phase 6 (Scheduling):** Confirm Render's actual process restart frequency and whether `setInterval` catch-up handles it adequately. The poll-on-request fallback (add the publish check to the feed handler) is a 3-line safety net if needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack unchanged and proven in production. node-cron is well-documented with 1.2M weekly downloads. All decisions are conservative and grounded in existing code. |
| Features | HIGH | Feature scope is clear and bounded. Patterns from Backyard Marquee's likes/comments directly translate. Competitor analysis (Substack, Ghost, Medium, Tumblr) confirms the feature set is appropriate. |
| Architecture | HIGH | All patterns derived from direct codebase review of what already runs in production. No speculative patterns. The integration surface is wide but each touch point is small and additive. |
| Pitfalls | HIGH (internal analysis), MEDIUM (external precedents) | Critical pitfalls from direct codebase analysis are HIGH confidence. External precedents (Ghost RSS bug, Turso INSERT OR IGNORE issue) are MEDIUM — real but may not apply exactly to this environment. |

**Overall confidence:** HIGH

### Gaps to Address

- **Turso `INSERT OR IGNORE` behavior for likes:** A known issue exists with this pattern in certain Turso transaction contexts (#2713). The Backyard Marquee codebase already uses this for `lineup_likes` — verify it works in the current Turso version before assuming it is safe for `post_likes`. Manual test in staging: like the same post twice from the same account, confirm count is 1.

- **`published_at` backfill:** The migration sets `published_at = created_at` for all existing posts via the column default. This is correct but means posts published over the past months will retain their original creation time as their `published_at` — which is accurate. No action needed, but worth confirming the feed ordering looks correct after migration before proceeding.

- **Comment spam at scale:** The research recommends a minimum account age before commenting (5 minutes) as a lightweight anti-spam measure. This is not in the explicit feature list but is a 3-line addition to the comment creation route: `WHERE users.created_at <= datetime('now', '-5 minutes')`. Worth including in Phase 4 implementation.

- **Render process restart frequency:** The scheduled publishing approach uses `setInterval` with a startup catch-up query. This is safe for infrequent restarts (daily or less). If Render restarts the process multiple times per hour (e.g., during deployments), the 60-second polling gap is irrelevant — the startup catch-up handles it. Confirm this assumption during Phase 6 implementation.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `server/routes/posts.js`, `server/routes/browse.js`, `server/routes/lineups.js`, `server/routes/auth.js`, `server/routes/feed.js`, `server/middleware/auth.js`, `server/db/index.js`, `client/src/context/AuthContext.jsx`, `client/src/api/client.js` — all architecture and integration patterns derived from direct code review
- SQLite / Turso ALTER TABLE with DEFAULT behavior — well-documented; existing rows get the column default automatically, no data migration needed for `status = 'published'`
- [Render Cron Jobs documentation](https://render.com/docs/cronjobs) — pricing ($1/mo minimum) and separate service model confirmed; why in-process scheduler is preferred

### Secondary (MEDIUM confidence)
- [node-cron npm (merencia)](https://www.npmjs.com/package/node-cron) — v3.0.3, 1.2M weekly downloads, pure JS, zero dependencies, GNU crontab syntax
- [WordPress Post Statuses](https://wordpress.org/documentation/article/post-status/) — canonical CMS draft/publish workflow reference
- [Payload CMS Drafts](https://payloadcms.com/docs/versions/drafts) — draft status pattern validation
- [Ghost CMS RSS feed bug #11266](https://github.com/TryGhost/Ghost/issues/11266) — real-world precedent for draft leak in public RSS
- [Turso UNIQUE constraint issue #2713](https://github.com/tursodatabase/turso/issues/2713) — known INSERT OR IGNORE edge case in Turso
- [node-cron scheduled jobs (DigitalOcean)](https://www.digitalocean.com/community/tutorials/nodejs-cron-jobs-by-examples) — confirms in-memory schedule loss on process restart
- [Better Stack node-cron guide](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/) — implementation patterns

### Tertiary (LOW confidence)
- [Liveblocks Commenting UX](https://liveblocks.io/blog/how-to-build-an-engaging-in-app-commenting-experience) — UX patterns for comment section design
- [ResultFirst Comment Design Trends](https://www.resultfirst.com/blog/web-design/15-best-comment-designs-trends-for-web-designers/) — comment design reference
- [Honeypot spam prevention](https://vibecodingwithfred.com/blog/honeypot-spam-protection/) — lightweight anti-spam strategy if rate limiting proves insufficient

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
