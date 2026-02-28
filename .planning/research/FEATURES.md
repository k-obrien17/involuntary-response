# Feature Research: v2.1 Reader Engagement & Editorial

**Domain:** Music micro-blogging platform -- reader participation + contributor editorial tools
**Researched:** 2026-02-28
**Confidence:** HIGH (patterns proven in existing codebase + well-documented domain)

## Context

This research covers only the v2.1 milestone features. The platform already has:
- Invite-only contributor auth (JWT + bcrypt), admin invite management
- Post CRUD with Spotify/Apple Music embeds, tags, artist extraction
- Reverse-chronological cursor-paginated feed
- Browse by tag, artist, contributor; profile pages; search
- OG meta tags, RSS feed, dark mode, Gravatar avatars

The existing `users` table has `role` (admin/contributor), `is_active`, `email`, `password_hash`, `display_name`, `username`, `bio`. The existing `lineups.js` routes in the Backyard Marquee half of this repo already implement toggle-likes and flat comments with the same patterns needed here.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that feel missing if absent for a platform adding engagement.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Reader signup (email + password + display name) | Readers need identity to like/comment. Every platform that enables engagement has accounts. | LOW | New `role: 'reader'` in existing `users` table. No invite token required. Reuse existing bcrypt/JWT flow. Username auto-generated from display name (existing `ensureUniqueUsername` function). |
| Post likes (toggle, one per reader per post) | Universal engagement signal. Substack, Tumblr, Medium, every content platform has a heart/like. Readers expect to be able to express appreciation with zero friction. | LOW | `post_likes` table with `UNIQUE(user_id, post_id)`. Toggle endpoint. Return liked state + count. Identical pattern to existing `lineup_likes` in Backyard Marquee. |
| Like count displayed on posts | If likes exist, counts must be visible. A like button without a count feels broken. | LOW | Batch-fetch counts in feed query (avoid N+1). Show on both feed cards and permalink pages. |
| Flat top-level comments | Comments are the standard reader feedback mechanism on editorial platforms. Substack, Medium, and Tumblr all have them. The project explicitly scopes to flat (not threaded) comments. | MEDIUM | `post_comments` table. Flat only (no parent_id). Display chronologically. Author can delete comments on their posts. Admin can delete any. Max length ~500 chars. |
| Contributor can edit published posts | Typos happen. Factual corrections are needed. Every blogging platform allows editing. The PUT endpoint already exists in `posts.js` -- this is about surfacing it in the UI. | LOW | Backend already implemented (PUT /:slug). Frontend needs an edit button on own posts that reopens the compose form pre-filled with existing content. Show "edited" indicator with updated_at if different from created_at. |
| Draft save (unpublished posts) | Contributors need to write without immediately publishing. WordPress, Ghost, Substack, and every CMS distinguish draft from published. | MEDIUM | Add `status` column to `posts` table: `draft`, `published`, `scheduled`. Drafts excluded from public feed/API. Only visible to the author in a "My Drafts" view. |
| Draft preview before publishing | Contributors need to see how a post will look before it goes live. Standard in every publishing platform. | LOW | Render the draft using the same post component but with a "Preview" banner and "Publish" button. No new API needed -- just fetch the draft by slug with author auth. |

### Differentiators (Competitive Advantage)

Features that elevate the platform beyond baseline expectations.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Scheduled publishing | Contributors can write posts during off-hours and set them to publish at optimal times. Substack and Ghost both offer this. Particularly valuable for a multi-contributor platform where editorial cadence matters. | MEDIUM | Add `publish_at` column to `posts`. Status = `scheduled` when `publish_at` is in the future. A periodic check (node-cron, every 60 seconds) flips status to `published` when `publish_at <= NOW()`. Simpler than a full job queue for this scale. |
| Like count in feed without N+1 | Showing engagement signals in the feed makes the platform feel alive and guides reader attention to popular takes. | LOW | Add `like_count` as a denormalized column on `posts` or compute via subquery in the feed query. The existing feed batch-fetches embeds, tags, and artists already -- likes slot into the same pattern. |
| Reader liked-state in feed (when logged in) | Readers seeing which posts they've already liked prevents confusion and encourages more engagement by showing their participation. | LOW | When `optionalAuth` provides a user, LEFT JOIN against `post_likes` in the feed query to include `user_has_liked` boolean per post. Same pattern as Backyard Marquee's `/lineups/:id/likes`. |
| Comment count in feed | Showing comment counts signals active discussion and draws readers into posts with conversation. | LOW | Subquery or denormalized count. Displayed alongside like count on feed cards. |
| "My Posts" contributor dashboard | A dedicated view showing published posts, drafts, and scheduled posts gives contributors control over their content pipeline. Not technically hard but significantly improves contributor UX. | LOW | Filtered views of the author's own posts by status. Uses existing auth + query filters. |
| Contributor can delete own comments on their posts | Post authors should be able to moderate their own space. This is standard on Substack and Medium. | LOW | Already a proven pattern in Backyard Marquee. Check if request user is the comment author OR the post author OR admin. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Magic link / passwordless reader auth | Lower friction than email+password. Eliminates password management. | Requires transactional email infrastructure (already have it for password reset, but adds email dependency for every login). Breaks the flow when readers can't check email immediately. Increases email ops cost at scale. For a small platform, password auth is simpler and proven. | Email + password signup. The platform already has this infrastructure for contributors. Readers get the same flow without invite tokens. |
| Social login (Google/GitHub) for readers | Faster signup. Fewer passwords. | Adds OAuth complexity, client ID management, and third-party dependency. The Backyard Marquee app has Google OAuth but it adds ~100 lines of code and requires Google Cloud Console setup. Overkill for a small reader base. | Start with email+password. Add Google OAuth later if signup friction proves to be a problem. |
| Reader profile pages | "I want to show off my likes and comments." | Readers are consumers, not creators. Building profile pages for readers adds UI surface area without clear value. The platform's identity is built around contributor voices, not reader identity. | Reader display name shown on comments is sufficient. No public profile page needed. |
| Email notifications for likes/comments | "Tell me when someone engages with my post." | Significant infrastructure: email templates, notification preferences, batch vs. real-time, unsubscribe handling. The contributor pool is small enough that checking the dashboard suffices. | Contributors check their "My Posts" view. Add email notifications in a future milestone if contributor count grows. |
| Comment editing | "I made a typo in my comment." | Adds complexity: edit history, "edited" state, time windows. Comments on short-form posts are ephemeral reactions, not polished content. | Delete and re-post. Simple, no ambiguity. |
| Comment reactions (emoji, upvote/downvote) | "Let me react to comments without writing one." | Feature creep. Comments on 500-800 char posts are already lightweight reactions. Adding reactions to reactions is meta-engagement that doesn't serve the core product. | Likes on posts only. Comments are the engagement layer. No sub-engagement. |
| Autosave for drafts | "Don't lose my work if I navigate away." | Adds client-side complexity (debounced save, dirty state tracking, conflict resolution if multiple tabs). Posts are ~800 chars -- losing a draft is 2 minutes of work, not 2 hours. | Manual save button. Clear "unsaved changes" warning on navigation (beforeunload). |
| Version history for post edits | "Let me see what I changed." | Significant database and UI complexity for minimal value. Posts are short. Edit history for 800-char posts is overkill. | Single current version. No edit history. Show "edited" badge with timestamp. |
| Scheduled post calendar view | "Show me my publishing calendar." | UI complexity for a feature that serves maybe 3-5 contributors. A list view of scheduled posts sorted by date achieves the same goal with far less work. | Sorted list of scheduled posts with dates in the "My Posts" dashboard. |
| Rate limiting comments to verified readers | "Prevent spam from new accounts." | Adds complexity (account age checks, verification tiers). The reader base is small and tied to a niche music platform -- spam is unlikely at this scale. | Rate limiting (already have the pattern) + require auth. Add honeypot field if spam becomes a problem. |

---

## Feature Dependencies

```
[Reader Accounts (email + password signup)]
    |-- enables --> [Post Likes]
    |                   |-- enables --> [Like count in feed]
    |                   |-- enables --> [Reader liked-state in feed]
    |
    |-- enables --> [Post Comments]
                        |-- requires --> [Comment moderation (post author + admin delete)]
                        |-- enables --> [Comment count in feed]

[Draft Status on Posts]
    |-- enables --> [Draft Save]
    |-- enables --> [Draft Preview]
    |-- enables --> [Scheduled Publishing]
    |                   |-- requires --> [Server-side scheduler (node-cron)]
    |
    |-- enables --> ["My Posts" Dashboard (draft/published/scheduled views)]

[Post Editing (backend already exists)]
    |-- enables --> [Edit UI on frontend]
    |-- enhances --> [Draft workflow (edit draft before publish)]

[Reader Accounts] ---- independent of ---- [Draft/Scheduling features]
```

### Dependency Notes

- **Reader accounts are prerequisite for likes and comments:** No engagement features work without reader identity. Build accounts first, then engagement.
- **Likes and comments are independent of each other:** Can ship likes without comments, or vice versa. Likes are simpler and higher value -- ship first.
- **Draft status is prerequisite for scheduling:** Scheduling is just "draft with a future publish_at date." The status column enables both.
- **Post editing backend already exists:** The PUT /:slug endpoint is implemented. This milestone only needs the frontend edit UI and the "edited" indicator.
- **Reader accounts and editorial features are fully independent:** These two feature groups have zero dependencies on each other and can be built in parallel or any order.

---

## Implementation Scope (v2.1 Specific)

### Build in This Milestone

Priority ordered by dependency chain and user value.

- [ ] **Reader signup** -- New registration endpoint without invite token requirement, `role: 'reader'`. Separate from contributor registration.
- [ ] **Reader login** -- Same login endpoint, works for both roles. JWT includes role.
- [ ] **Post likes** -- `post_likes` table, toggle endpoint, count endpoint, feed integration.
- [ ] **Post comments** -- `post_comments` table, create/list/delete endpoints, moderation (author + admin delete).
- [ ] **Like/comment counts in feed** -- Modify feed query to include counts. Add `user_has_liked` for authenticated readers.
- [ ] **Post status column** -- Migration adding `status TEXT DEFAULT 'published'` to `posts`. Values: `draft`, `published`, `scheduled`.
- [ ] **Draft save + list** -- Modified POST endpoint respects status. New "My Drafts" API filter. Frontend drafts view.
- [ ] **Draft preview** -- Frontend-only: render draft with same PostView component + preview banner.
- [ ] **Publish from draft** -- PATCH endpoint to set status from `draft` to `published`.
- [ ] **Edit post UI** -- Frontend edit button on own posts, pre-filled compose form. Backend already done.
- [ ] **Edited indicator** -- Show "edited" badge when `updated_at > created_at` on published posts.
- [ ] **Scheduled publishing** -- `publish_at` column, node-cron job (60s interval), status flip. Frontend datetime picker.
- [ ] **"My Posts" dashboard** -- Filtered views of own posts by status (published/draft/scheduled).

### Defer Beyond v2.1

- [ ] **Email notifications for engagement** -- Wait for contributor pool to grow
- [ ] **Reader profile pages** -- Not needed at this scale
- [ ] **Social login for readers** -- Add if signup friction is measured
- [ ] **Comment editing** -- Delete and re-post suffices
- [ ] **Autosave drafts** -- Posts are short enough that manual save is fine

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Depends On |
|---------|------------|---------------------|----------|------------|
| Reader signup/login | HIGH | LOW | P1 | Nothing (extends existing auth) |
| Post likes (toggle + count) | HIGH | LOW | P1 | Reader accounts |
| Like count + liked-state in feed | HIGH | LOW | P1 | Likes |
| Post comments (flat, top-level) | HIGH | MEDIUM | P1 | Reader accounts |
| Comment count in feed | MEDIUM | LOW | P1 | Comments |
| Post status column (draft/published/scheduled) | HIGH | LOW | P1 | Nothing (DB migration) |
| Draft save + My Drafts view | HIGH | MEDIUM | P1 | Post status column |
| Draft preview | MEDIUM | LOW | P1 | Drafts |
| Post edit UI | HIGH | LOW | P1 | Nothing (backend exists) |
| Edited indicator | LOW | LOW | P2 | Post edit UI |
| Publish from draft | HIGH | LOW | P1 | Drafts |
| Scheduled publishing | MEDIUM | MEDIUM | P2 | Post status + node-cron |
| "My Posts" dashboard | MEDIUM | LOW | P2 | Post status column |
| Comment moderation (author delete) | MEDIUM | LOW | P1 | Comments |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, include if time permits (low risk to defer to v2.2)

---

## Existing Pattern Reuse

The project already has proven implementations for most of these patterns. This reduces risk significantly.

| v2.1 Feature | Existing Pattern | What to Reuse |
|-------------|-----------------|---------------|
| Reader accounts | Contributor registration (`server/routes/auth.js`) | Same endpoint, skip invite token validation when `role: 'reader'`. Same bcrypt hash, JWT generation, username derivation. |
| Post likes | Lineup likes (`server/routes/lineups.js` lines 231-245) | Identical toggle pattern, UNIQUE constraint, count query. Copy and adapt for `post_likes`. |
| Post comments | Lineup comments (`server/routes/lineups.js` lines 268-320) | Same flat comment structure, sanitization, auth check, delete-own-comment pattern. |
| Rate limiting | Multiple existing limiters | Same `express-rate-limit` config: 60 likes/15min, 20 comments/15min. |
| Feed batch fetching | Posts feed (`server/routes/posts.js` lines 142-186) | Existing N+1 avoidance pattern for embeds, tags, artists. Add likes/comments to the same batch. |
| Draft preview | PostView component (frontend) | Render with same component + preview banner overlay. |

---

## Schema Additions

### New Tables

```sql
-- Post likes (identical pattern to lineup_likes)
CREATE TABLE post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE(user_id, post_id)
);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);

-- Post comments (identical pattern to lineup_comments)
CREATE TABLE post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
```

### Column Additions

```sql
-- Post status and scheduling
ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE posts ADD COLUMN publish_at DATETIME;
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_publish_at ON posts(publish_at);
```

### Auth Changes

No schema changes needed for reader accounts. The existing `users` table already supports multiple roles via the `role` column. Reader signup simply inserts with `role: 'reader'` instead of `role: 'contributor'`.

---

## Competitor Context for v2.1 Features

| Feature | Substack | Medium | Tumblr | Ghost | Our Approach |
|---------|----------|--------|--------|-------|--------------|
| Reader accounts | Email subscription (implicit account) | Google/email signup | Tumblr account required | Email subscription | Email + password. No subscription required. Lightweight. |
| Likes | Heart icon, count shown | Clap (variable, 1-50 per user) | Heart, count shown | None (subscriber model) | Heart toggle, one per reader per post. Simple. |
| Comments | Threaded, subscriber-only | Threaded, anyone | Reblogs (no direct comments on most themes) | Threaded, member-only | Flat, top-level only. Reader account required. Matches minimal ethos. |
| Drafts | Full draft workflow, auto-save | Full draft workflow, auto-save | Queue and draft | Full draft workflow, auto-save | Manual save, status field. No auto-save. Posts are short enough. |
| Post editing | Full editing after publish | Full editing after publish | Full editing | Full editing after publish | Full editing (backend exists). Show "edited" badge. |
| Scheduling | Date/time picker | Not available (publish only) | Queue scheduling | Date/time picker, timezone-aware | Date/time picker. Server polls every 60s. UTC storage. |

### Key Insight

Substack and Ghost are the closest comparisons for editorial workflow features (drafts, scheduling). But those platforms serve long-form content where drafts and scheduling are essential for 2000+ word pieces. For 800-char micro-posts, the editorial workflow should be dramatically simpler:
- No auto-save (the post is one paragraph)
- No collaborative editing (single author)
- No approval workflow (contributors are trusted, invite-only)
- No revision history (too short to warrant it)

The simplicity of the content format should be reflected in the simplicity of the editorial tools.

---

## Sources

- [WordPress Post Statuses](https://wordpress.org/documentation/article/post-status/) -- HIGH confidence, canonical CMS workflow reference
- [Sanity CMS Draft/Publishing Glossary](https://www.sanity.io/glossary/drafts--publishing-workflow) -- MEDIUM confidence, CMS vendor docs
- [ButterCMS Draft to Published](https://buttercms.com/kb/page-status-draft-to-published/) -- MEDIUM confidence, CMS vendor docs
- [Payload CMS Drafts](https://payloadcms.com/docs/versions/drafts) -- HIGH confidence, official documentation
- [Node-cron vs Node-schedule comparison](https://npm-compare.com/cron,node-cron,node-schedule) -- MEDIUM confidence, npm comparison tool
- [Better Stack Node-cron Guide](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/) -- MEDIUM confidence, developer guide
- [SuperTokens Magic Links](https://supertokens.com/blog/magiclinks) -- MEDIUM confidence, auth vendor blog
- [Auth0 Magic Link Docs](https://auth0.com/docs/authenticate/passwordless/authentication-methods/email-magic-link) -- HIGH confidence, official docs
- [Liveblocks Commenting UX](https://liveblocks.io/blog/how-to-build-an-engaging-in-app-commenting-experience) -- MEDIUM confidence, product blog
- [ResultFirst Comment Design Trends](https://www.resultfirst.com/blog/web-design/15-best-comment-designs-trends-for-web-designers/) -- LOW confidence, design blog
- Existing codebase: `server/routes/lineups.js` (like/comment patterns) -- HIGH confidence, proven in production
- Existing codebase: `server/routes/posts.js` (POST/PUT/GET, batch N+1 avoidance) -- HIGH confidence, proven in production
- Existing codebase: `server/routes/auth.js` (registration, JWT, username generation) -- HIGH confidence, proven in production

---
*Feature research for: v2.1 Reader Engagement & Editorial -- Involuntary Response*
*Researched: 2026-02-28*
