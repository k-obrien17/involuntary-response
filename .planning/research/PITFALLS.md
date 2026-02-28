# Pitfalls Research

**Domain:** Adding reader engagement + editorial features to existing Express/Turso content platform
**Researched:** 2026-02-28
**Confidence:** HIGH (analysis grounded in existing codebase review), MEDIUM (external patterns from multiple sources)

## Critical Pitfalls

### Pitfall 1: Draft/Scheduled Posts Leaking Into Public Feeds and RSS

**What goes wrong:**
Adding a `status` column to the existing `posts` table (values: `published`, `draft`, `scheduled`) is straightforward. What is not straightforward is finding and updating every query that returns posts to filter by status. The existing codebase has at least 7 locations that query posts: the feed listing in `posts.js` (GET /), the single-post lookup (GET /:slug), the tag browse, artist browse, contributor browse, the explore aggregation in `browse.js`, the RSS feed in `feed.js`, and the search endpoint. Miss any one of these and drafts or scheduled posts appear publicly -- in the feed, in RSS subscribers' readers, in search results, or in browse-by-tag results. Ghost CMS had exactly this bug (GitHub issue #11266) where unpublished posts appeared in their RSS feed.

**Why it happens:**
The `status` column gets added to the schema, and the create/update endpoints get modified to handle it. But developers grep for `FROM posts` and miss queries that join through other tables (e.g., `post_tags`, `post_artists`). They also forget that the RSS feed (`feed.js`) is a completely separate code path from the API. The explore endpoint aggregates counts and "latest" timestamps -- if it counts drafts, tag/artist popularity is inflated.

**How to avoid:**
- Before writing any code, enumerate every query that touches the `posts` table. The current codebase has these locations:
  - `server/routes/posts.js` -- GET / (feed listing), GET /:slug (single post), POST / (create), PUT /:slug (update), DELETE /:slug (delete)
  - `server/routes/browse.js` -- GET /tag/:tag, GET /artist/:name, GET /contributor/:username, GET /explore
  - `server/routes/feed.js` -- GET / (RSS)
  - `server/routes/search.js` -- search endpoint
- Add `WHERE p.status = 'published'` to every read query except the author's own draft listing.
- Create a helper function (e.g., `publishedFilter()`) that returns the status clause and use it in every query, rather than relying on developers remembering to add it manually.
- The migration that adds the `status` column must use `DEFAULT 'published'` so all existing posts remain visible.
- For `GET /:slug`, the single-post endpoint must check status: drafts should only be viewable by their author (requires `optionalAuth` middleware, currently not used on this route).

**Warning signs:**
- A draft post appears in the RSS feed
- The explore page shows inflated counts after adding draft support
- A scheduled post is accessible via its slug URL before its publish date
- Search returns drafts to unauthenticated users

**Phase to address:**
Draft/Publish workflow phase -- but the query audit must happen first, before any schema change is applied. The status filter is a cross-cutting concern that touches nearly every route file.

---

### Pitfall 2: AuthContext Assumes a Single User Type

**What goes wrong:**
The existing `AuthContext.jsx` stores `user` as a flat object with `{ id, email, displayName, username, role }` where `role` is always `'contributor'` or `'admin'`. The `generateToken()` function in `auth.js` encodes `{ id, email, role, username }` into the JWT. When reader accounts are added, every piece of code that checks `user.role` or assumes the user is a contributor breaks subtly. The contributor-only pages (create post, admin dashboard) don't gate on role -- they gate on whether `user` exists at all. A reader who logs in would see the "New Post" button, the admin panel links, and could potentially access contributor-only routes.

**Why it happens:**
When there was only one user type (contributor), the question "is the user logged in?" was equivalent to "is the user a contributor?" Once readers can also log in, these are no longer the same question. Developers add reader registration but forget to audit every conditional that checks `if (user)` when it should check `if (user && user.role === 'contributor')`.

**How to avoid:**
- Audit every use of `useAuth()` and `user` in the frontend before adding reader accounts. List every place where "logged in" currently implies "can post."
- Create explicit role-checking helpers in AuthContext: `isContributor()`, `isAdmin()`, `isReader()`. Replace bare `user` checks with the appropriate helper.
- On the server side, `authenticateToken` middleware verifies the token is valid but does not check roles. Create a `requireRole('contributor')` middleware that wraps `authenticateToken` and checks `req.user.role`. Apply it to POST/PUT/DELETE post routes, invite routes, and admin routes.
- Do NOT add a separate `ReaderAuthContext`. Use the same context but add role-aware helpers. Two auth contexts sharing the same localStorage token key would conflict.
- The JWT payload already includes `role` -- no token format change is needed.

**Warning signs:**
- A reader account can see the "New Post" button in the navbar
- A reader can access `/admin` or `/create` routes
- A reader's API request to `POST /api/posts` returns 201 instead of 403
- The "login" flow doesn't distinguish where to redirect contributors vs. readers

**Phase to address:**
Reader accounts phase -- this must be the first thing addressed before reader registration is built. The role model is a prerequisite for safe reader registration.

---

### Pitfall 3: Scheduled Post Publishing Without a Reliable Scheduler

**What goes wrong:**
SQLite/Turso has no built-in job scheduler. Developers implement scheduled publishing with `node-cron` or `setInterval` inside the Express process. This works in development but fails in production: Render (the hosting platform) can restart the process at any time, losing all in-memory scheduled jobs. If the process restarts 5 minutes before a scheduled post, that post silently misses its publish time and stays in `scheduled` status until the next check interval (or forever, if the check only ran at startup). Worse, `node-cron` schedules are not persistent -- they exist only in the Node process memory.

**Why it happens:**
Developers think "I'll run a cron job every minute to check for posts past their scheduled time" and implement it in-process. This works on a local machine that stays running but not on a cloud platform where processes are ephemeral.

**How to avoid:**
- Use a poll-on-request pattern instead of a background job. On every feed request (GET /api/posts), run a quick query: `UPDATE posts SET status = 'published' WHERE status = 'scheduled' AND publish_at <= CURRENT_TIMESTAMP`. This piggybacks publishing on traffic with zero infrastructure.
- Additionally, set up a simple external health check that hits `/api/health` every few minutes (Render provides this, or use a free uptime monitor). Add the publish check to the health endpoint so posts are published even during low-traffic periods.
- For a more robust approach: use a lightweight interval (e.g., `setInterval` every 60 seconds) that runs `UPDATE posts SET status = 'scheduled' WHERE status = 'scheduled' AND publish_at <= CURRENT_TIMESTAMP` -- but design it so it is idempotent and self-healing. On process startup, immediately run the query to catch any missed publishes during downtime.
- Never store scheduled times in the Node process memory. The database IS the schedule. The check is just `SELECT * FROM posts WHERE status = 'scheduled' AND publish_at <= NOW()`.

**Warning signs:**
- Scheduled posts don't publish when the server restarts overnight
- Multiple scheduled posts publish simultaneously when traffic resumes after a quiet period (acceptable, actually -- but the contributor should see correct timestamps)
- The `publish_at` time passes and the post is still in `scheduled` status

**Phase to address:**
Scheduled publishing phase -- but the database schema (adding `publish_at` column) should be planned alongside the `status` column in the draft workflow phase.

---

### Pitfall 4: Like/Comment Counts Creating N+1 Query Explosions

**What goes wrong:**
The existing feed query is already well-optimized: it batch-fetches embeds, tags, and artists for all posts in a single page using `WHERE post_id IN (...)`. But developers add likes and comments by appending per-post subqueries: for each post in the feed, run `SELECT COUNT(*) FROM post_likes WHERE post_id = ?` and `SELECT COUNT(*) FROM post_comments WHERE post_id = ?`. With 20 posts per page, this adds 40 extra queries per feed request. It works fine with 10 posts but becomes noticeable at 100+ and unacceptable at 1000+.

**Why it happens:**
Like and comment counts feel "cheap" -- they're just counts. Developers add them as an afterthought in the response mapping (`posts.map(p => ({ ...p, likeCount: await getCount(p.id) }))`). They don't notice the N+1 because the queries are fast individually. The feed still loads in 200ms, so it seems fine. But it is 40 queries that should be 2.

**How to avoid:**
- Follow the existing batch-loading pattern in `browse.js` (`batchLoadPostData`). Add like counts and comment counts to the batch:
  ```sql
  SELECT post_id, COUNT(*) as count FROM post_likes WHERE post_id IN (?, ?, ...) GROUP BY post_id
  SELECT post_id, COUNT(*) as count FROM post_comments WHERE post_id IN (?, ?, ...) GROUP BY post_id
  ```
- Build the count maps the same way embeds and tags are built: `likeCountMap[post_id] = count`, then merge into the response.
- If the authenticated user is a reader, also batch-check if they've liked each post: `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (?, ?, ...)` -- this returns the user's liked-post set in a single query.
- Do NOT add a `like_count` denormalized column to the `posts` table yet. At the expected scale (hundreds of posts, dozens of readers), `COUNT(*)` with an indexed `post_id` column is fast enough. Premature denormalization adds complexity (keeping the count in sync) without solving a real performance problem.

**Warning signs:**
- The feed endpoint's query count grows proportionally with page size
- Feed load time increases from ~50ms to ~200ms after adding likes/comments
- Adding `EXPLAIN QUERY PLAN` shows sequential scans on the likes table

**Phase to address:**
Reader engagement phase (likes and comments) -- the batch-loading pattern already exists in `browse.js`, so the template is clear. The risk is forgetting to use it.

---

### Pitfall 5: Cursor Pagination Breaks When Posts Change Status

**What goes wrong:**
The existing cursor pagination uses `(created_at, id)` as the cursor key. This works perfectly when all posts are published and immutable in their feed ordering. But drafts and scheduled posts add a new dimension: a post's `status` can change from `draft` to `published`, or from `scheduled` to `published`, at any time. If a scheduled post publishes with its original `created_at` (from when the draft was saved), it appears deep in the feed history rather than at the top. If the cursor is based on `created_at`, readers who are mid-pagination might miss it entirely or see it twice.

**Why it happens:**
The cursor pagination was designed for an append-only feed where new posts always have the latest `created_at`. Drafts and scheduling break this assumption because the creation time and the publication time are different.

**How to avoid:**
- Add a `published_at` column that gets set when a post transitions to `published` status. For existing posts, backfill `published_at = created_at`.
- Change the cursor pagination to use `(published_at, id)` instead of `(created_at, id)` for public feeds. This ensures scheduled posts appear at the top of the feed when they publish, not buried at their draft creation time.
- Keep `created_at` as an immutable record of when the post was first created (useful for contributor dashboards and edit history).
- Update `updated_at` only when the post content changes, not when status changes.
- The RSS feed should also order by `published_at` and only include posts where `status = 'published'`.

**Warning signs:**
- A scheduled post publishes but appears 3 pages deep in the feed
- The RSS feed shows a new item with a date from last week
- Contributors are confused because their post "published" but nobody saw it

**Phase to address:**
Draft/Publish workflow phase -- the `published_at` column must be added in the same migration as `status`. Retrofitting it later requires updating all pagination queries and recalculating cursors.

---

### Pitfall 6: Reader Registration Conflicting with Contributor Invite Flow

**What goes wrong:**
The existing registration endpoint (`POST /api/auth/register`) requires an invite token. Reader registration should NOT require an invite token -- it is open to anyone with an email. If you add reader registration as a second code path in the same endpoint (e.g., "if no token, create as reader"), you create a security hole: anyone can register without an invite and get an account. The role assignment might default to `contributor` (the current default in the schema: `role TEXT NOT NULL DEFAULT 'contributor'`), accidentally giving open registration to contributor access.

**Why it happens:**
Developers try to reuse the existing registration endpoint and add conditional logic. The schema default of `role = 'contributor'` was safe when invites were required, but becomes dangerous when open registration is added.

**How to avoid:**
- Create a separate endpoint: `POST /api/auth/register/reader` for reader signup (email + display name + password, no invite token required).
- Keep the existing `POST /api/auth/register` endpoint unchanged for invite-only contributor registration.
- Change the schema default for `role` from `'contributor'` to `'reader'` -- this is the safer default. The contributor registration endpoint explicitly sets `role = 'contributor'`.
- Alternatively, remove the default entirely and require every INSERT to specify a role explicitly. This prevents any code path from accidentally creating a user with the wrong role.
- The reader registration endpoint must have its own rate limiter (tighter than contributor registration, since it is public-facing).

**Warning signs:**
- A user registers without an invite token and gets contributor access
- The `role` column default is still `'contributor'` after adding reader registration
- Both registration paths use the same rate limiter (the invite-protected one is less at risk than the public one)

**Phase to address:**
Reader accounts phase -- this is a security-critical decision that must be made before implementing any registration flow for readers.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `node-cron` for scheduled publishing | Simple, no external dependencies | Lost schedules on process restart; posts silently miss their publish time on Render | Never for the sole mechanism; acceptable as a complement to poll-on-request |
| Denormalized `like_count` column on posts | Fast reads without JOIN | Must keep in sync on every like/unlike; race conditions on concurrent likes; stale counts if sync fails | Only after actual performance problems at scale (1000+ likes per post); premature at current scale |
| Single `users` table for both contributors and readers | Simple schema, shared auth logic | Role confusion if not carefully gated; reader rows outnumber contributor rows 100:1, cluttering admin views | Acceptable -- use the existing `role` column to differentiate. Separate tables would be worse. |
| Storing edit history as JSON in a column | No new table, simple to implement | Cannot query across revisions; large posts create large JSON blobs; no index on revision metadata | Only if edit history is purely cosmetic (show "edited" badge). If you need "view revision N" or "diff revisions," use a revision table. |
| Skipping email verification for reader accounts | Faster signup, less friction | Fake email registrations, no way to send notifications, email enumeration if you add "forgot password" for readers | MVP only -- acceptable if reader accounts are low-stakes (just likes/comments, no email notifications planned) |

## Integration Gotchas

Common mistakes when connecting new features to the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Existing `optionalAuth` middleware on feed routes | Not using `optionalAuth` on feed/post routes, so the API cannot tell if the current reader has liked a post | Add `optionalAuth` to GET /api/posts and GET /api/posts/:slug so `req.user` is populated when available. Return `likedByMe: true/false` in the response. The middleware already exists and handles missing tokens gracefully. |
| Existing `sanitize()` function in posts.js | Reusing it for comments without adjusting max length | Create a comment-specific sanitization with appropriate max length (e.g., 500 chars for comments vs. 1200 for posts). Same HTML stripping, different limits. |
| Existing cursor pagination in browse.js | Not updating browse-by-tag/artist/contributor queries with the new `status = 'published'` filter and `published_at` ordering | Every browse query in `browse.js` must be updated simultaneously with the feed query in `posts.js`. They share the same cursor format. |
| Existing RSS feed in feed.js | Forgetting to add `WHERE status = 'published'` to the RSS query | The RSS feed is a separate route file (`feed.js`) that queries posts independently. It is the most commonly missed location for status filtering. |
| Existing `batchLoadPostData()` helper | Not extending it to include like/comment counts | Extend the existing helper rather than writing parallel batch-loading code. Add like counts and comment counts as additional maps returned from the function. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-post like count subquery in feed | Feed load time scales linearly with page size | Batch-load counts with `GROUP BY post_id` and `IN (...)` clause, matching existing embed/tag pattern | 20+ posts per page with active readers |
| Checking "has user liked this post?" per-post | 20 extra queries per feed page per authenticated reader | Single query: `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (...)` | Immediately -- even with 1 reader and 20 posts per page |
| Loading all comments for a post in a single query without pagination | Comments endpoint returns 500+ comments at once | Cursor-paginate comments (newest first, `LIMIT 20`), load more on demand | 50+ comments on a popular post |
| Scheduled post check running every second | Unnecessary CPU and database load; Turso has request quotas | Check every 60 seconds max, or use poll-on-request. A post publishing 30 seconds late is fine. | Immediately (wastes Turso free tier quota) |

## Security Mistakes

Domain-specific security issues for reader engagement features.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Reader registration without rate limiting | Bot spam creates thousands of fake accounts to manipulate like counts | Separate, aggressive rate limiter on `POST /api/auth/register/reader` (e.g., 5 registrations per IP per hour). Add a honeypot hidden form field. |
| Comments without spam prevention | Comment section fills with SEO spam, phishing links, and abuse | Rate limit comments per user (e.g., 10 per 15 minutes). Strip URLs from comments (or render them as plain text). Require account to comment (no anonymous comments). Add a minimum account age before commenting (e.g., 5 minutes) to prevent drive-by spam accounts. |
| Likes without UNIQUE constraint | A reader can like a post multiple times, inflating counts | Use `UNIQUE(user_id, post_id)` on the likes table and `INSERT OR IGNORE`. This matches the Backyard Marquee pattern with `lineup_likes`. |
| Draft posts accessible via slug URL to anyone | Unpublished content exposed to anyone who guesses/knows the slug | The single-post endpoint (GET /:slug) must check post status: if `draft` or `scheduled`, only the author can view it. Requires adding `optionalAuth` to this route and checking `req.user.id === post.author_id` for non-published posts. |
| No comment deletion capability | No way to remove abusive, spam, or accidentally-posted comments | Allow post authors to delete comments on their own posts. Allow admins to delete any comment. Allow comment authors to delete their own comments. All three are needed. |
| Password reset available to readers without email verification | Account takeover via unverified email claim | If reader email is not verified, do not allow password reset for that email. Or require email verification before enabling password reset. The existing forgot-password flow responds 200 regardless (preventing enumeration) but sends a real reset email. |

## UX Pitfalls

Common user experience mistakes when adding engagement features.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Like count visible but login required to like | Reader taps heart, gets a login wall. Friction kills engagement. | Show the heart icon with count to everyone. On tap without auth, show a lightweight inline signup prompt (not a full-page redirect). After signup, immediately register the like so the user sees instant feedback. |
| Draft saves require manual action | Contributor writes a long take, navigates away, loses work. | Auto-save drafts on a debounced timer (e.g., every 30 seconds if content has changed). Show a "Draft saved" indicator. The save should be a PUT to the post's slug with `status: 'draft'`. |
| Edit replaces content with no undo | Contributor accidentally publishes a bad edit and the original is gone. | Store at least the previous version (a single `previous_body` column is sufficient for v1). Show an "edited" indicator with timestamp on the post. Full revision history can come later. |
| Scheduled post with no confirmation of scheduled time | Contributor sets a schedule, saves, then has no way to see when it will publish or to cancel/reschedule. | Show scheduled posts in a contributor dashboard with their `publish_at` time. Allow editing the scheduled time or converting back to draft. Show a clear "Scheduled for [date/time]" badge on the post in the contributor's view. |
| Comment notification to contributor via polling | Contributor has no idea someone commented on their post until they manually check. | For v2.1, show an unread comment indicator in the navbar when the contributor logs in (a simple "N new comments" badge based on comments since last visit). Full notification system (email, push) can be deferred. |
| Comments shown with newest first on short-form posts | The first comment a reader sees may be a response to something they haven't read yet; feels disjointed. | Show comments oldest-first (chronological) since posts are short-form takes, not long discussions. The conversation reads naturally top-to-bottom. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Draft support:** Often missing status filter in RSS feed -- verify `feed.js` only returns `status = 'published'` posts by curling the RSS endpoint after creating a draft.
- [ ] **Draft support:** Often missing status filter in search -- verify the search endpoint does not return draft or scheduled posts.
- [ ] **Draft support:** Often missing status filter in browse-by-tag -- verify `/api/browse/tag/:tag` does not include draft posts that have tags.
- [ ] **Draft support:** Often missing status filter in explore aggregations -- verify `/api/browse/explore` counts and "latest" timestamps only reflect published posts.
- [ ] **Scheduled posts:** Often missing startup catch-up -- verify that after a server restart, any posts whose `publish_at` has passed are immediately published.
- [ ] **Likes:** Often missing the "unlike" action -- verify a reader can tap the heart again to remove their like, and the count decrements.
- [ ] **Likes:** Often missing `likedByMe` in the feed response -- verify that an authenticated reader sees a filled heart on posts they have already liked without a separate API call per post.
- [ ] **Comments:** Often missing HTML sanitization on comment body -- verify that `<script>alert('xss')</script>` in a comment renders as escaped text, not executable code.
- [ ] **Comments:** Often missing the ability for the post author to delete comments -- verify that a contributor can remove a comment on their own post.
- [ ] **Post editing:** Often missing updated `updated_at` display -- verify that edited posts show an "edited" indicator so readers know the content has changed.
- [ ] **Reader registration:** Often missing role enforcement on the create-post API -- verify that a reader's JWT token gets a 403 from `POST /api/posts`, not a 201.
- [ ] **Reader registration:** Often missing the schema default change -- verify `role` default is `'reader'` (or no default), not `'contributor'`.
- [ ] **Cursor pagination:** Often missing `published_at` ordering -- verify that a post scheduled for tomorrow, when published, appears at the top of the feed, not at its `created_at` position.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Drafts leaked into public feed/RSS | LOW | Add `WHERE status = 'published'` to all queries. Run a one-time audit of RSS feed output. No data loss, just query fixes. |
| Reader got contributor access | MEDIUM | Change their role in the database. Audit any posts they created (delete or reassign). Fix the registration endpoint. Review all created content. |
| Scheduled posts never published (missed by scheduler) | LOW | Run `UPDATE posts SET status = 'published', published_at = publish_at WHERE status = 'scheduled' AND publish_at <= CURRENT_TIMESTAMP`. Add startup catch-up. No data loss. |
| Cursor pagination breaks on status change | MEDIUM | Add `published_at` column, backfill from `created_at`, update all feed queries. Clients with cached cursors may see duplicates on next load (acceptable, self-healing). |
| N+1 queries on likes/comments | LOW | Refactor to batch-loading. No schema change needed, just query restructuring. Follow the `batchLoadPostData` pattern in `browse.js`. |
| Comment spam flood | MEDIUM | Add rate limiting to comment endpoint. Bulk-delete spam comments by pattern or user. Consider adding account age requirement retroactively. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Draft/scheduled posts leaking into public queries | Draft workflow | `curl /api/posts`, `/api/browse/tag/test`, `/api/feed`, `/api/search?q=test` -- none return draft/scheduled posts |
| AuthContext single-user-type assumption | Reader accounts (first) | Reader account cannot see "New Post" button; `POST /api/posts` with reader JWT returns 403 |
| Scheduled publishing without reliable scheduler | Scheduled posts | Schedule a post, restart server, verify post publishes within 60 seconds of its `publish_at` time |
| N+1 queries on like/comment counts | Likes and comments | Feed endpoint makes exactly N+2 additional queries (like counts + comment counts) regardless of page size, not N*2 |
| Cursor pagination breaking on status change | Draft workflow | Schedule a post for tomorrow, publish it, verify it appears as the newest item in the feed |
| Reader registration conflicting with invite flow | Reader accounts | Register without invite token via reader endpoint, verify role is `reader`; register via contributor endpoint without invite token, verify 400 error |
| RSS feed exposing unpublished content | Draft workflow | Create a draft, curl `/api/feed`, verify draft slug does not appear in RSS XML |
| Comment spam | Comments | Create 11 comments in 15 minutes from same user, verify 11th is rate-limited |
| Draft slug accessible to public | Draft workflow | Create a draft, request its slug without auth, verify 404 (not the draft content) |
| Like count inflation | Likes | Like same post twice from same user, verify count is 1 not 2 (UNIQUE constraint) |

## Sources

- [Ghost CMS: RSS feed contains unpublished posts (GitHub #11266)](https://github.com/TryGhost/Ghost/issues/11266) -- MEDIUM confidence, real-world precedent for draft leak pitfall
- [Mattermost: RSS feeds broadcast unpublished posts](https://forum.mattermost.com/t/blog-management-issue-rss-feeds-broadcast-unpublished-posts/264) -- MEDIUM confidence, second platform with same bug
- [Turso Concurrent Writes](https://turso.tech/blog/beyond-the-single-writer-limitation-with-tursos-concurrent-writes) -- MEDIUM confidence, confirms SQLite single-writer considerations for likes
- [Turso UNIQUE constraint errors in transactions (GitHub #2713)](https://github.com/tursodatabase/turso/issues/2713) -- MEDIUM confidence, known issue with INSERT OR IGNORE in transactions
- [node-cron npm](https://www.npmjs.com/package/node-cron) -- HIGH confidence, confirms in-memory scheduling with no persistence
- [DigitalOcean: node-cron scheduled jobs](https://www.digitalocean.com/community/tutorials/nodejs-cron-jobs-by-examples) -- MEDIUM confidence, confirms schedule loss on restart
- [express-rate-limit: dynamic rate limiting](https://dev.to/techjayvee/dynamic-rate-limiting-middleware-in-express-5hlm) -- MEDIUM confidence, patterns for role-based rate limits
- [Honeypot spam prevention without CAPTCHA](https://vibecodingwithfred.com/blog/honeypot-spam-protection/) -- MEDIUM confidence, lightweight anti-spam strategy
- Existing codebase analysis: `server/routes/posts.js`, `server/routes/browse.js`, `server/routes/feed.js`, `server/middleware/auth.js`, `client/src/context/AuthContext.jsx`, `server/db/index.js` -- HIGH confidence, direct code review

---
*Pitfalls research for: Involuntary Response v2.1 -- Reader Engagement and Editorial Features*
*Researched: 2026-02-28*
