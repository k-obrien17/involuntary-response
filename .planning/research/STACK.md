# Stack Research: v2.1 Reader Engagement & Editorial

**Domain:** New features for existing music micro-blogging platform
**Researched:** 2026-02-28
**Confidence:** HIGH -- all features build on existing patterns, only one new dependency needed

## Thesis

Almost everything needed for v2.1 is already in the codebase. The existing JWT auth, bcrypt, express-rate-limit, nanoid, nodemailer, and sanitization patterns handle reader accounts, likes, comments, drafts, and post editing with zero new dependencies. The only genuinely new capability is scheduled publishing, which needs an in-process task scheduler.

## What's Already In Place (DO NOT ADD)

These are NOT recommendations -- they are the existing stack. Listed here to prevent redundant additions.

| Existing Technology | Already Used For | Covers v2.1 Feature |
|---------------------|------------------|---------------------|
| JWT (jsonwebtoken 9.0.2) | Contributor auth tokens with role claim | Reader auth tokens -- add `role: 'reader'` to same system |
| bcrypt (bcryptjs 3.0.3) | Contributor password hashing | Reader password hashing -- identical flow |
| express-rate-limit 8.2.1 | Auth endpoints (20/15min), post creation (20/hr), post updates (40/hr) | Like/comment/reader-registration rate limiting -- same pattern |
| nanoid 5.1.6 | Post slugs, invite tokens | No new use needed |
| nodemailer 8.0.1 | Password reset emails | Reader welcome emails, email verification (if added) |
| Regex sanitization | `sanitize()` in posts.js strips HTML tags, enforces max length | Comment body sanitization -- same function |
| `optionalAuth` middleware | Attach user to request without requiring auth | Show "liked by you" state on posts for logged-in readers |
| `authenticateToken` middleware | Require valid JWT for contributor routes | Require valid JWT for like/comment actions |

## New Stack Additions

### The One New Dependency: node-cron

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| node-cron | 3.0.3 | In-process scheduled task runner | Publish scheduled posts at their `publish_at` time |

**Why node-cron over alternatives:**

- **node-cron 3.0.3** (the `node-cron` npm package by merencia, not `cron` by kelektiv): Lightweight, pure JS, zero dependencies, GNU crontab syntax. 1.2M weekly downloads. Run a check every minute inside the Express process.
- **Not `cron` (kelektiv):** More mature (2.3M weekly downloads) but heavier, designed for more complex scheduling. Overkill for "check DB and flip a status column."
- **Not Render Cron Jobs:** Separate service ($1/month minimum), spins up a fresh container each run. Correct for heavy batch jobs, overkill for "run a SQL UPDATE every minute." Also adds deployment complexity (second service to maintain).
- **Not node-schedule:** 700K weekly downloads, more complex API with Date-based scheduling. We don't need one-off scheduling -- we need a repeating check.

**Implementation pattern:**
```javascript
import cron from 'node-cron';

// Run every minute: publish posts whose publish_at has passed
cron.schedule('* * * * *', async () => {
  try {
    const result = await db.run(
      `UPDATE posts SET status = 'published'
       WHERE status = 'scheduled'
       AND publish_at <= CURRENT_TIMESTAMP`
    );
    if (result.changes > 0) {
      console.log(`Published ${result.changes} scheduled post(s)`);
    }
  } catch (err) {
    console.error('Scheduled publish error:', err);
  }
});
```

This runs inside the existing Express process on Render. No second service, no additional infrastructure, no cold starts. Maximum publish delay: ~60 seconds after the scheduled time. Acceptable for a blog.

**Installation:**
```bash
cd /Users/keithobrien/server && npm install node-cron
```

## Schema Changes (No New Libraries)

These are database migrations, not library additions. Included here because they ARE the "stack" for these features.

### Posts Table Additions

```sql
-- Migration: add draft/scheduling support
ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE posts ADD COLUMN publish_at DATETIME;
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_publish_at ON posts(publish_at) WHERE status = 'scheduled';
```

**Status values:** `draft`, `published`, `scheduled`

- Existing posts default to `published` (backward compatible)
- New posts created with `status = 'draft'` when saved as draft
- Posts with `publish_at` set get `status = 'scheduled'`
- Feed query adds `WHERE p.status = 'published'` (currently has no status filter)

### Users Table: Reader Role

```sql
-- No schema change needed.
-- Existing role column accepts any TEXT value.
-- Currently: 'admin', 'contributor'
-- Add: 'reader'
```

Reader accounts use the same `users` table with `role = 'reader'`. The existing `generateToken` already includes role in the JWT claim. The `authenticateToken` middleware already checks `is_active`. Readers just skip the invite token requirement during registration.

### Likes Table

```sql
-- Migration: post likes
CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
```

**Pattern:** Identical to Backyard Marquee's `lineup_likes`. UNIQUE constraint via composite PK prevents double-likes. Count via `SELECT COUNT(*) FROM post_likes WHERE post_id = ?`.

### Comments Table

```sql
-- Migration: post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
```

**Flat only** (per PROJECT.md: "threaded comments" is out of scope). Max comment length: 500 characters. Sanitized with the existing `sanitize()` function from posts.js.

## API Surface Changes

### New Routes (reader auth, likes, comments)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/auth/register-reader` | Rate limited, no invite | Reader signup (email + password + display name) |
| POST | `/api/posts/:slug/like` | `authenticateToken` | Toggle like (insert or delete) |
| GET | `/api/posts/:slug/likes` | None | Get like count (+ `likedByMe` if authed) |
| POST | `/api/posts/:slug/comments` | `authenticateToken` | Add comment |
| GET | `/api/posts/:slug/comments` | `optionalAuth` | List comments for post |
| DELETE | `/api/posts/:slug/comments/:id` | `authenticateToken` | Delete own comment (or admin) |

### Modified Routes (drafts, scheduling, editing)

| Method | Route | Change |
|--------|-------|--------|
| POST | `/api/posts` | Accept `status` ('draft' or 'published') and `publish_at` datetime |
| PUT | `/api/posts/:slug` | Allow editing body, embed, tags, status, publish_at |
| GET | `/api/posts` | Add `WHERE status = 'published'` to public feed; add `?drafts=true` for contributor's own drafts |
| GET | `/api/posts/:slug` | Show drafts only to their author; show scheduled posts only to their author |

### Rate Limiting (existing library, new endpoints)

| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| Reader registration | 10 per 15 min per IP | Prevent spam signups |
| Like toggle | 60 per 15 min per user | Match existing pattern |
| Comment creation | 20 per 15 min per user | Prevent comment spam |
| Post creation (draft) | 20 per hour per user | Same as current post creation |

## Alternatives Considered

| Decision | Alternative | Why Not |
|----------|-------------|---------|
| In-process node-cron for scheduling | Render Cron Job service | $1/month, separate deployment, container cold start per run. Overkill for a single SQL UPDATE |
| In-process node-cron for scheduling | node-schedule | More complex API (Date objects, RecurrenceRule), designed for one-off scheduled events. We need a repeating poller |
| Same `users` table for readers | Separate `readers` table | Doubles auth logic, JWT token handling, middleware. Readers are just users with `role = 'reader'`. One table, one auth flow |
| Toggle-like endpoint (POST toggles) | Separate PUT like / DELETE unlike | Toggle is simpler for the client. One button, one endpoint. Server checks existence and inserts or deletes |
| Flat comments only | Threaded/nested comments | Explicitly out of scope per PROJECT.md. Flat is correct for short-form posts |
| Email-only reader signup | Google OAuth for readers | Adds complexity (Google Client ID, OAuth flow). Email + password is sufficient for lightweight reader accounts. Revisit if reader adoption is slow |
| 500-char comment limit | Unlimited comments | Comments should not be longer than posts (~800 chars). 500 is generous for reactions to paragraph-length content |
| No email verification for readers | Email verification required | Simplifies MVP. Can add later if spam becomes a problem. Rate limiting + moderation are the first defense |
| `status` column on posts | Separate `drafts` table | Single table with a status column is simpler. Drafts and published posts share the same schema. Avoids data duplication and migration complexity |

## What NOT to Add

| Avoid | Why | What Exists Instead |
|-------|-----|---------------------|
| DOMPurify / isomorphic-dompurify | Content is plain text, not HTML. The regex `str.replace(/<[^>]*>/g, '')` in `sanitize()` strips tags. Comments and posts are never rendered as raw HTML | Existing `sanitize()` function in posts.js |
| Profanity filter (bad-words, etc.) | Invite-only contributors control the editorial voice. Readers who abuse comments can be moderated by admins | Admin moderation (delete comments, deactivate users) |
| WebSocket library (socket.io, ws) | Real-time likes/comments are nice-to-have but unnecessary. Refresh or re-fetch on navigation is fine for a blog's traffic level | Standard HTTP requests with Axios |
| Notification system library | Push notifications, email notifications for likes/comments -- all scope creep. Contributors can check their posts manually | Nothing. Defer entirely |
| Pagination library | Cursor pagination is already hand-rolled in posts.js. Comments won't need pagination initially (short posts get few comments) | Existing cursor pagination pattern |
| React Query / SWR | State management for likes/comments can use React's built-in useState + useEffect. The app has no complex cache invalidation needs | `useState` + `useEffect` + Axios |
| date-fns | Listed in initial research but never installed in client/package.json. Not needed yet -- "3 hours ago" formatting can use a 10-line utility function or `Intl.RelativeTimeFormat` | Browser-native `Intl.RelativeTimeFormat` |
| slugify | Listed in initial research but never installed. Posts already use nanoid for slugs | `nanoid` (already installed) |

## Integration Points

### AuthContext Changes (client-side)

The existing `AuthContext` stores `{ id, email, displayName, username, role }`. Reader accounts will have `role: 'reader'`. The context needs:

1. A `registerReader` method (no invite token parameter)
2. Role-based UI gating: `user.role === 'contributor' || user.role === 'admin'` for post creation
3. Any authenticated user can like/comment

No new libraries. Just new methods on the existing `auth` API client and `AuthContext`.

### Feed Query Change

Current query in `GET /api/posts`:
```sql
SELECT ... FROM posts p JOIN users u ON p.author_id = u.id
ORDER BY p.created_at DESC, p.id DESC
```

Must become:
```sql
SELECT ... FROM posts p JOIN users u ON p.author_id = u.id
WHERE p.status = 'published'
ORDER BY p.created_at DESC, p.id DESC
```

Plus like count aggregation:
```sql
SELECT ..., (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count
```

### Contributor Draft Management

New client page: `/drafts` -- lists contributor's own drafts and scheduled posts. Uses existing patterns:
- `api.get('/posts', { params: { drafts: true } })` -- fetched with auth token
- Server filters: `WHERE p.author_id = ? AND p.status IN ('draft', 'scheduled')`

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| node-cron@3.0.3 | Node 18+, runs inside Express process | Pure JS, no native dependencies |
| All existing packages | No changes | bcryptjs, jsonwebtoken, express-rate-limit, nanoid, nodemailer all stay at current versions |

## Summary

**Add:** `node-cron@3.0.3` (server only)

**Change:** 4 database migrations (posts status/publish_at columns, post_likes table, post_comments table), new auth route for readers, new API routes for likes/comments, feed query filter, AuthContext reader methods.

**Do not add:** No new client dependencies. No DOMPurify, no profanity filters, no WebSockets, no React Query, no date-fns. The existing stack handles everything.

## Sources

- [Render Cron Jobs documentation](https://render.com/docs/cronjobs) -- Pricing ($1/mo minimum), limitations, separate service model (HIGH confidence)
- [node-cron npm](https://www.npmjs.com/package/node-cron) -- v3.0.3, 1.2M weekly downloads, pure JS scheduler (MEDIUM confidence -- npm page, could not fetch directly)
- [cron npm](https://www.npmjs.com/package/cron) -- v4.4.0, kelektiv, 2.3M weekly downloads, heavier alternative (MEDIUM confidence)
- [express-rate-limit npm](https://www.npmjs.com/package/express-rate-limit) -- v8.2.1, already installed (HIGH confidence)
- Existing codebase: `server/routes/posts.js`, `server/routes/auth.js`, `server/middleware/auth.js`, `server/db/index.js`, `server/lib/email.js`, `client/src/context/AuthContext.jsx`, `client/src/api/client.js` (HIGH confidence -- direct code review)

---
*Stack research for: Involuntary Response v2.1 -- Reader Engagement & Editorial*
*Researched: 2026-02-28*
