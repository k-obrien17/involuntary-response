# Architecture Research: v2.1 Reader Engagement & Editorial

**Domain:** Reader participation + editorial workflow integration into existing music micro-blogging platform
**Researched:** 2026-02-28
**Confidence:** HIGH (all features integrate with known patterns in existing codebase)

## Existing System Snapshot

Before defining integration points, here is what exists today and what each new feature touches.

### Current Tables

| Table | Purpose | Relevant to v2.1? |
|-------|---------|-------------------|
| `users` | Contributors + admin (role: contributor/admin) | YES -- must support `reader` role |
| `invite_tokens` | Invite-only contributor registration | NO -- readers bypass invites |
| `password_reset_tokens` | Password reset flow | YES -- readers need this too |
| `posts` | Published posts (slug, body, author_id, created_at, updated_at) | YES -- needs `status` + `scheduled_at` columns |
| `post_embeds` | One embed per post (Spotify/Apple Music oEmbed) | NO -- unchanged |
| `post_tags` | Tags per post (max 5) | NO -- unchanged |
| `post_artists` | Artist extraction results per post | NO -- unchanged |
| `migrations` | Schema migration tracking | YES -- new migrations appended |

### Current Auth Model

```
users.role = 'admin' | 'contributor'
Registration requires invite_token -> role = 'contributor'
JWT payload: { id, email, role, username }
Middleware: authenticateToken (required auth), optionalAuth (attach if present)
```

### Current Route Files

| Route File | Endpoints | Touched by v2.1? |
|------------|-----------|-------------------|
| `auth.js` | register, login, forgot/reset-password | YES -- reader registration (no invite) |
| `posts.js` | CRUD + list | YES -- draft/schedule status, like/comment endpoints |
| `feed.js` | RSS feed | YES -- must exclude drafts/scheduled |
| `browse.js` | tag/artist/contributor/explore | YES -- must exclude drafts/scheduled, show like counts |
| `search.js` | Full-text search | YES -- must exclude drafts/scheduled |
| `profile.js` | Public profile + bio edit | MINOR -- post listing must exclude drafts |
| `embeds.js` | oEmbed resolver | NO |
| `invites.js` | Admin invite management | NO |
| `users.js` | Admin user management | MINOR -- may list readers too |

## Integration Architecture

### New Database Tables (3 new, 1 altered)

```sql
-- Migration 5: Add reader accounts, likes, comments, and post status
--
-- ALTER existing table
ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE posts ADD COLUMN scheduled_at DATETIME;

-- New tables
CREATE TABLE post_likes (
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled ON posts(status, scheduled_at);
```

**Why this schema:**

- `post_likes` uses composite PK `(post_id, user_id)` -- same pattern as Backyard Marquee's `lineup_likes`. One like per user per post is enforced at the DB level. No separate `id` column needed.
- `post_comments` is flat (no `parent_id`) -- PROJECT.md explicitly says "top-level only, flat" and threaded comments are out of scope.
- `posts.status` uses TEXT not INTEGER because SQLite has no enum type. Values: `'published'`, `'draft'`, `'scheduled'`. Default `'published'` preserves backward compatibility -- existing rows automatically become `status = 'published'` without a data migration.
- `posts.scheduled_at` is nullable -- only set when `status = 'scheduled'`.
- No `edited_at` column needed -- `updated_at` already tracks this. The existing PUT route already sets `updated_at = CURRENT_TIMESTAMP`.

### Users Table: Reader Role

The existing `users` table already supports what readers need. No schema change required beyond using a new role value.

```
Existing columns sufficient:
  id, email, password_hash, display_name, username, role, is_active, created_at

New role value: 'reader'
Reader has: email, password_hash, display_name, username (auto-generated)
Reader lacks: invite token requirement (bypasses invite flow)
```

**No `bio` column needed for readers** -- readers do not have public profile pages. If this changes later, the `bio` column already exists on the table.

### Component Responsibilities

| Component | Responsibility | New / Modified |
|-----------|----------------|----------------|
| `auth.js` routes | Reader registration (no invite), login (unchanged) | MODIFIED -- new `/register-reader` endpoint |
| `posts.js` routes | Draft CRUD, publish, schedule, like, comment | MODIFIED -- status filtering, new sub-routes |
| `feed.js` routes | RSS feed of published posts | MODIFIED -- add `WHERE p.status = 'published'` |
| `browse.js` routes | Tag/artist/contributor browsing | MODIFIED -- add `WHERE p.status = 'published'` to all queries |
| `search.js` routes | Full-text search | MODIFIED -- add `WHERE p.status = 'published'` |
| `profile.js` routes | Public profile post list | MODIFIED -- add `WHERE p.status = 'published'` |
| `middleware/auth.js` | Auth middleware | MODIFIED -- add `requireContributor` helper |
| `AuthContext.jsx` | Client auth state | MODIFIED -- expose `isContributor` / `isReader` |
| `PostForm.jsx` | Post creation/editing form | MODIFIED -- save-as-draft + schedule controls |
| `ViewPost.jsx` | Single post view | MODIFIED -- add LikeButton + CommentSection |
| `PostCard.jsx` | Post in feed lists | MODIFIED -- add like count display |
| `Navbar.jsx` | Navigation bar | MODIFIED -- reader-specific nav items |
| NEW: `LikeButton.jsx` | Like toggle with count | NEW component |
| NEW: `CommentSection.jsx` | Comment list + form | NEW component |
| NEW: `Drafts.jsx` | Contributor's draft management page | NEW page |
| NEW: `ReaderRegister.jsx` | Reader signup page | NEW page |
| NEW: `ContributorRoute.jsx` | Route guard requiring contributor role | NEW component |
| NEW: `server/lib/scheduler.js` | Scheduled post publisher | NEW module |

## System Overview (v2.1)

```
              PUBLIC READERS          READER ACCOUNTS          CONTRIBUTORS
              (no auth)               (email signup)           (invite-only)
                  |                        |                        |
                  v                        v                        v
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React SPA (Vite 5)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   Feed   │  │  Single  │  │  Browse   │  │  Drafts  │  │  Create  │     │
│  │   Page   │  │  Post +  │  │ (Artist/  │  │  Page    │  │  / Edit  │     │
│  │          │  │  Likes + │  │   Tag)    │  │ (contri- │  │  Post +  │     │
│  │          │  │ Comments │  │          │  │  butor)  │  │ Schedule │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │              │             │              │             │           │
│  ┌────┴──────────────┴─────────────┴──────────────┴─────────────┴─────┐    │
│  │              Axios API Client + Auth Interceptor                     │    │
│  └───────────────────────────┬─────────────────────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │  /api/*
                               v
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Express 5 API Server                                  │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Auth Routes  │  │ Post Routes  │  │  Browse/Feed │  │  Scheduler     │  │
│  │  (invite +   │  │ (CRUD, like, │  │  (feed, tag, │  │  (setInterval  │  │
│  │   reader     │  │  comment,    │  │   artist,    │  │   publishes    │  │
│  │   register)  │  │  draft)      │  │   search)   │  │   scheduled)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                 │                  │                  │           │
│  ┌──────┴─────────────────┴──────────────────┴──────────────────┴───────┐   │
│  │                    Middleware Layer                                    │   │
│  │  authenticateToken | optionalAuth | requireContributor | rate-limit   │   │
│  └───────────────────────────┬───────────────────────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │
                               v
                    ┌──────────────────┐
                    │  Turso (libSQL)  │
                    │  - users         │  (role: admin | contributor | reader)
                    │  - posts         │  (status: published | draft | scheduled)
                    │  - post_embeds   │
                    │  - post_tags     │
                    │  - post_artists  │
                    │  - post_likes    │  (NEW)
                    │  - post_comments │  (NEW)
                    │  - invite_tokens │
                    │  - migrations    │
                    └──────────────────┘
```

## Data Flow

### Reader Registration Flow

```
[Reader] -> POST /api/auth/register-reader
              { email, password, displayName }
              (NO invite token)
         -> Server validates email/password
         -> bcrypt hash, generate username
         -> INSERT users (role: 'reader')
         -> generateToken({ id, email, role: 'reader', username })
         -> Return { token, user }
         -> Client stores in localStorage, AuthContext updates
```

**Why a separate endpoint instead of modifying `/register`:**
The existing `/register` validates an invite token, marks it as used, and sets `role = 'contributor'`. Mixing reader logic into that flow would add branching complexity and risk breaking the invite flow with its atomic race condition protection. A separate `/register-reader` endpoint is cleaner -- each endpoint does exactly one thing. The login endpoint is shared (readers and contributors use the same `/login`).

### Post Status Flow

```
                                  ┌─────────────┐
                                  │   draft      │
                                  └──────┬───────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                          v              v              v
                   ┌────────────┐ ┌───────────┐ ┌──────────────┐
                   │ published  │ │ scheduled │ │  (delete)    │
                   └────────────┘ └─────┬─────┘ └──────────────┘
                          ^             │
                          │             │ (scheduler fires when
                          │             │  scheduled_at <= now)
                          │             v
                          │      ┌────────────┐
                          └──────│ published  │
                                 └────────────┘
```

**Status transitions:**
- `draft` -> `published` (contributor clicks "Publish")
- `draft` -> `scheduled` (contributor sets future date + clicks "Schedule")
- `scheduled` -> `published` (server-side scheduler fires)
- `published` -> `draft` (unpublish -- contributor can pull back a post)
- Any status -> deleted (hard delete, same as current behavior)

### Like Flow

```
[Reader or Contributor] -> POST /api/posts/:slug/like
                             (authenticateToken middleware)
                        -> Check: post exists AND status = 'published'
                        -> INSERT OR IGNORE into post_likes (post_id, user_id)
                        -> Return { liked: true, count }

[Reader or Contributor] -> DELETE /api/posts/:slug/like
                             (authenticateToken middleware)
                        -> DELETE FROM post_likes WHERE post_id = ? AND user_id = ?
                        -> Return { liked: false, count }
```

**Like count in feeds:** The list queries (posts.js GET /, browse.js, search.js) add a subquery to include `like_count`. This is a count, not per-user status, so it works without auth. The per-user `liked` boolean is only needed on the single post view (ViewPost) where `optionalAuth` can check `post_likes` for the current user.

### Comment Flow

```
[Reader or Contributor] -> POST /api/posts/:slug/comments
                             (authenticateToken middleware)
                             { body } (max 500 chars, sanitized)
                        -> Check: post exists AND status = 'published'
                        -> INSERT INTO post_comments
                        -> Return { id, body, user: { displayName, username }, createdAt }

[Any visitor]           -> GET /api/posts/:slug/comments
                        -> SELECT comments + user display info
                        -> Return { comments: [...] }

[Comment author OR post author OR admin] -> DELETE /api/posts/:slug/comments/:id
                        -> Verify ownership or post-author or admin role
                        -> DELETE FROM post_comments WHERE id = ?
                        -> Return { message: 'Comment deleted' }
```

### Draft/Schedule Flow

```
[Contributor] -> POST /api/posts (existing endpoint, enhanced)
                   { body, embedUrl, tags, artistName, status: 'draft' }
              -> status defaults to 'published' if not provided (backward compat)
              -> If status = 'scheduled', scheduledAt is required and must be in the future

[Contributor] -> GET /api/posts/drafts
                   (authenticateToken, requireContributor)
              -> Returns caller's drafts + scheduled posts, ordered by updated_at DESC

[Contributor] -> PUT /api/posts/:slug (existing endpoint, enhanced)
                   { ..., status: 'published' } (publish a draft)
                   { ..., status: 'scheduled', scheduledAt: '2026-03-15T10:00:00Z' }
```

### Scheduled Post Publisher

```
Server startup (index.js):
  -> Import startScheduler from lib/scheduler.js
  -> startScheduler() called after initDatabase()

startScheduler():
  -> setInterval(publishScheduledPosts, 60_000)  // check every minute

publishScheduledPosts():
  -> SELECT id, slug FROM posts
     WHERE status = 'scheduled' AND scheduled_at <= CURRENT_TIMESTAMP
  -> For each: UPDATE posts SET status = 'published' WHERE id = ?
  -> Log: "Published N scheduled posts"
```

**Why `setInterval` instead of cron/external scheduler:**
- The app runs on Render as a single always-on process. `setInterval` is the simplest approach with zero infrastructure.
- 60-second granularity is fine for a blog -- posts publishing within a minute of the target time is acceptable.
- No dependency on external services (cron, scheduled tasks, message queues).
- If the process restarts, the interval restarts and catches up immediately since it checks `scheduled_at <= now`.

## Architectural Patterns

### Pattern 1: Status-Filtered Queries (Critical)

**What:** Every query that returns posts to public visitors must filter by `status = 'published'`.

**Where it applies (10 query sites):**
- `GET /api/posts` (main feed) -- posts.js
- `GET /api/posts/:slug` (single post, special case) -- posts.js
- `GET /api/browse/tag/:tag` -- browse.js
- `GET /api/browse/artist/:name` -- browse.js
- `GET /api/browse/contributor/:username` -- browse.js
- `GET /api/browse/explore` -- browse.js
- `GET /api/search` -- search.js
- `GET /api/feed` (RSS) -- feed.js
- `GET /api/users/:username/profile` -- profile.js
- Vercel OG tag serverless function

**Implementation:**
```sql
-- Before (every public query):
SELECT ... FROM posts p WHERE ...

-- After (add status filter):
SELECT ... FROM posts p WHERE p.status = 'published' AND ...
```

**The single-post GET is special:** If the requesting user is the post's author, show the post regardless of status (so they can preview drafts). If not the author, require `status = 'published'`.

```javascript
// GET /api/posts/:slug -- modified to use optionalAuth
router.get('/:slug', optionalAuth, async (req, res) => {
  const post = await db.get('SELECT ... FROM posts p WHERE p.slug = ?', req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // Non-published posts are only visible to their author
  if (post.status !== 'published' && (!req.user || req.user.id !== post.author_id)) {
    return res.status(404).json({ error: 'Post not found' });
  }
  // ... rest of handler
});
```

**Trade-offs:** Adding `AND p.status = 'published'` to every query is repetitive but explicit. A database view (`CREATE VIEW published_posts AS ...`) would reduce repetition but Turso/libsql views can be finicky and add indirection that makes the codebase harder to grep. Given 10 query sites, explicit filtering is the right call.

### Pattern 2: Role-Based Access Layers

**What:** Three tiers of access: anonymous, reader, contributor (+ admin).

**Current middleware:**
- `optionalAuth` -- attaches `req.user` if token present, continues regardless
- `authenticateToken` -- requires valid token, checks `is_active`

**New middleware:**
```javascript
// middleware/auth.js -- add this export
export function requireContributor(req, res, next) {
  if (!req.user || (req.user.role !== 'contributor' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Contributor access required' });
  }
  next();
}
```

**Where roles apply:**

| Action | Anonymous | Reader | Contributor | Admin |
|--------|-----------|--------|-------------|-------|
| Read published posts | YES | YES | YES | YES |
| Like a post | -- | YES | YES | YES |
| Comment on a post | -- | YES | YES | YES |
| Delete own comment | -- | YES | YES | YES |
| Create a post | -- | -- | YES | YES |
| Edit own post | -- | -- | YES | YES |
| Save draft | -- | -- | YES | YES |
| Schedule post | -- | -- | YES | YES |
| Delete comments on own post | -- | -- | YES | YES |
| Delete any comment | -- | -- | -- | YES |
| Admin panel | -- | -- | -- | YES |

**Client-side role checks:**
```javascript
// In AuthContext, expose helpers alongside existing user state
const isContributor = user?.role === 'contributor' || user?.role === 'admin';
const isReader = user?.role === 'reader';
const isAdmin = user?.role === 'admin';
```

### Pattern 3: Batch-Load Counts (Avoid N+1)

**What:** Like counts and comment counts for post lists must be batch-loaded, not per-post queried.

The existing codebase already solves this exact pattern for embeds, tags, and artists via batch IN queries in both `posts.js` (GET /) and `browse.js` (via the `batchLoadPostData` helper). Likes and comments follow the same approach.

```javascript
// After fetching post rows, alongside existing embed/tag/artist batch loads:
if (postIds.length > 0) {
  const ph = postIds.map(() => '?').join(',');

  // Existing batch loads: embeds, tags, artists (unchanged)

  // New: like counts
  const likeCounts = await db.all(
    `SELECT post_id, COUNT(*) as count
     FROM post_likes WHERE post_id IN (${ph}) GROUP BY post_id`,
    ...postIds
  );
  const likeCountMap = {};
  for (const lc of likeCounts) {
    likeCountMap[lc.post_id] = lc.count;
  }

  // New: comment counts
  const commentCounts = await db.all(
    `SELECT post_id, COUNT(*) as count
     FROM post_comments WHERE post_id IN (${ph}) GROUP BY post_id`,
    ...postIds
  );
  const commentCountMap = {};
  for (const cc of commentCounts) {
    commentCountMap[cc.post_id] = cc.count;
  }
}

// Add to post response shape:
// likeCount: likeCountMap[p.id] || 0,
// commentCount: commentCountMap[p.id] || 0,
```

**Where this applies:**
- `posts.js` GET / (main feed) -- has its own batch-load inline
- `browse.js` batchLoadPostData helper -- used by tag, artist, contributor, explore
- `profile.js` GET /:username/profile -- has its own batch-load inline
- `search.js` -- needs its own batch-load

**Recommendation:** Extract the batch-load logic from `browse.js` (the `batchLoadPostData` + `formatPosts` helpers) into a shared module (`server/lib/post-helpers.js`) and import it across all four files. This avoids duplicating the like/comment count batch-load in 4 places.

**Trade-offs:** Adds 2 additional queries per list request (likes + comments). At current data volume (tens of posts, single-digit readers) this is negligible. If it becomes a concern later, denormalized `like_count`/`comment_count` columns on `posts` with increment/decrement on like/unlike would eliminate these queries.

## Recommended Project Structure Changes

### Server (modified + new files)

```
server/
├── index.js                  # MODIFIED: import + start scheduler
├── db/index.js               # MODIFIED: append migration 5
├── middleware/
│   └── auth.js               # MODIFIED: add requireContributor export
├── lib/
│   ├── scheduler.js          # NEW: publishScheduledPosts interval
│   ├── post-helpers.js       # NEW: extracted batchLoadPostData + formatPosts
│   ├── email.js              # Unchanged
│   ├── oembed.js             # Unchanged
│   ├── spotify.js            # Unchanged
│   └── apple-music.js        # Unchanged
└── routes/
    ├── auth.js               # MODIFIED: add /register-reader endpoint
    ├── posts.js              # MODIFIED: status handling, /drafts, /:slug/like, /:slug/comments
    ├── browse.js             # MODIFIED: add WHERE status='published', import shared helpers
    ├── feed.js               # MODIFIED: add WHERE status='published'
    ├── search.js             # MODIFIED: add WHERE status='published'
    ├── profile.js            # MODIFIED: add WHERE status='published', import shared helpers
    ├── invites.js            # Unchanged
    ├── users.js              # Unchanged
    └── embeds.js             # Unchanged
```

### Client (modified + new files)

```
client/src/
├── pages/
│   ├── Home.jsx              # Unchanged (feed already shows published posts)
│   ├── ViewPost.jsx          # MODIFIED: add LikeButton + CommentSection
│   ├── CreatePost.jsx        # MODIFIED: handle draft/schedule from PostForm
│   ├── EditPost.jsx          # MODIFIED: handle status changes
│   ├── Drafts.jsx            # NEW: contributor's draft + scheduled list
│   ├── ReaderRegister.jsx    # NEW: reader signup form
│   ├── Login.jsx             # Unchanged (works for all roles)
│   ├── Register.jsx          # Unchanged (contributor invite flow)
│   └── ...                   # Other pages unchanged
├── components/
│   ├── PostForm.jsx          # MODIFIED: add status selector + schedule date picker
│   ├── PostCard.jsx          # MODIFIED: add like count + comment count display
│   ├── LikeButton.jsx        # NEW: heart icon + count + toggle
│   ├── CommentSection.jsx    # NEW: comment list + add form + delete
│   ├── Navbar.jsx            # MODIFIED: conditional nav for reader vs contributor
│   ├── ProtectedRoute.jsx    # Unchanged
│   ├── ContributorRoute.jsx  # NEW: wrapper requiring contributor role
│   └── ...                   # Other components unchanged
├── context/
│   └── AuthContext.jsx       # MODIFIED: add isContributor, isReader, registerReader
├── api/
│   └── client.js             # MODIFIED: add likes, comments, drafts, readerAuth methods
└── App.jsx                   # MODIFIED: add routes /register/reader, /drafts
```

## Integration Points

### Where New Code Touches Existing Code

| Existing File | What Changes | Risk Level |
|---------------|-------------|------------|
| `server/db/index.js` | Append migration 5 (ALTER TABLE + CREATE TABLE) | LOW -- append-only pattern |
| `server/middleware/auth.js` | Add `requireContributor` export | LOW -- additive |
| `server/routes/auth.js` | Add `/register-reader` endpoint | LOW -- new endpoint, existing `/register` untouched |
| `server/routes/posts.js` | Status param to create/update, /drafts, /:slug/like, /:slug/comments | MEDIUM -- most changes here |
| `server/routes/browse.js` | Add `AND p.status = 'published'` to 4 queries, batch counts | LOW -- small additions |
| `server/routes/feed.js` | Add `AND p.status = 'published'` to 1 query | LOW -- one-line addition |
| `server/routes/search.js` | Add `AND p.status = 'published'` to query | LOW -- one-line addition |
| `server/routes/profile.js` | Add `AND p.status = 'published'` to profile post query | LOW -- one-line addition |
| `server/index.js` | Import + start scheduler (2 lines) | LOW |
| `client/src/api/client.js` | Add `likes`, `comments`, `drafts`, `readerAuth` exports | LOW -- additive |
| `client/src/context/AuthContext.jsx` | Add `isContributor`, `isReader`, `registerReader` | LOW -- additive |
| `client/src/components/PostForm.jsx` | Add status selector + schedule date picker | MEDIUM -- modifying core form |
| `client/src/pages/ViewPost.jsx` | Add LikeButton + CommentSection below post | LOW -- appending to layout |
| `client/src/components/PostCard.jsx` | Add like count + comment count display | LOW -- small UI addition |
| `client/src/components/Navbar.jsx` | Conditional items for reader vs contributor | MEDIUM -- nav logic complexity |
| `client/src/App.jsx` | Add 3 new routes | LOW -- additive |

### API Client Additions

```javascript
// client/src/api/client.js -- new exports appended

export const readerAuth = {
  register: (email, password, displayName) =>
    api.post('/auth/register-reader', { email, password, displayName }),
};

export const likes = {
  like: (slug) => api.post(`/posts/${slug}/like`),
  unlike: (slug) => api.delete(`/posts/${slug}/like`),
};

export const comments = {
  list: (slug) => api.get(`/posts/${slug}/comments`),
  create: (slug, body) => api.post(`/posts/${slug}/comments`, { body }),
  delete: (slug, commentId) =>
    api.delete(`/posts/${slug}/comments/${commentId}`),
};

export const drafts = {
  list: () => api.get('/posts/drafts'),
};
```

### New Route Endpoints Summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/auth/register-reader` | None | Reader signup |
| `GET` | `/api/posts/drafts` | Contributor | List caller's drafts + scheduled |
| `POST` | `/api/posts/:slug/like` | Any auth | Like a post |
| `DELETE` | `/api/posts/:slug/like` | Any auth | Unlike a post |
| `GET` | `/api/posts/:slug/comments` | None | List comments on a post |
| `POST` | `/api/posts/:slug/comments` | Any auth | Add a comment |
| `DELETE` | `/api/posts/:slug/comments/:id` | Auth + ownership | Delete a comment |

All existing endpoints remain unchanged in their URL structure. The `POST /api/posts` and `PUT /api/posts/:slug` endpoints gain an optional `status` parameter (defaults to `'published'` for backward compatibility).

### Rate Limiting for New Endpoints

| Endpoint | Window | Max | Rationale |
|----------|--------|-----|-----------|
| `POST /auth/register-reader` | 15 min | 5 | Prevent registration abuse |
| `POST /posts/:slug/like` | 15 min | 120 | Lightweight action, allow batch browsing |
| `DELETE /posts/:slug/like` | 15 min | 120 | Same as like |
| `POST /posts/:slug/comments` | 15 min | 20 | Prevent comment spam |
| `DELETE /posts/:slug/comments/:id` | 15 min | 30 | Moderation shouldn't be throttled hard |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Tables per Role

**What people do:** Create `reader_likes` separate from contributor likes, or `reader_comments` vs `contributor_comments`.

**Why it's wrong:** The existing `users` table handles all roles in one table. Likes and comments should follow suit. A `user_id` FK to the unified `users` table is sufficient. Role checks happen in middleware, not in table structure.

**Do this instead:** Single `post_likes` and `post_comments` tables with FK to `users`. Access control in application layer.

### Anti-Pattern 2: Eager-Loading Per-User Like Status for All Posts in Feed

**What people do:** For every post in the feed, query whether the current user has liked it (requiring auth + N extra queries or a complex LEFT JOIN).

**Why it's wrong:** The feed is public and works without auth. Adding a per-user `liked` boolean to every post in every list query couples the feed to auth state unnecessarily.

**Do this instead:** Show like *counts* in feeds (batch-loaded via GROUP BY, no auth needed). Show the per-user *liked* boolean only on the single post view (ViewPost), where `optionalAuth` + a single additional query is acceptable.

### Anti-Pattern 3: Client-Side Draft Storage

**What people do:** Store drafts in localStorage or IndexedDB to avoid server round-trips.

**Why it's wrong:** Drafts disappear when the user clears browser data or switches devices. The point of drafts is persistence.

**Do this instead:** Drafts are server-side, stored in the `posts` table with `status = 'draft'`. The server is the source of truth. Auto-save can debounce updates via PUT.

### Anti-Pattern 4: Modifying the Existing `/register` Endpoint for Readers

**What people do:** Add an `isReader` flag to the existing registration endpoint, making invite token conditional.

**Why it's wrong:** The existing registration flow has careful invite token validation with race condition protection (atomic UPDATE with `WHERE used_by IS NULL`). Branching this flow for readers adds complexity to critical security code.

**Do this instead:** Separate `/register-reader` endpoint. Simple, no invite logic, clearly different user flow.

### Anti-Pattern 5: Conditional Status Column in Migration

**What people do:** Run a data migration to set `status = 'published'` on all existing posts after adding the column.

**Why it's wrong:** The column default handles this automatically. `ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published'` sets every existing row's status to `'published'` -- no data migration needed.

**Do this instead:** Use the column default. Trust SQLite's ALTER TABLE behavior with DEFAULT values.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k readers | Current approach is fine. `setInterval` scheduler, COUNT subqueries for likes. |
| 1k-10k readers | Denormalize `like_count` on `posts` table if list queries slow down. Add pagination to comments. |
| 10k+ readers | Move scheduler to a separate worker. Consider Turso read replicas. Comment pagination with cursor. |

### What Breaks First

1. **Like count queries in feeds** -- COUNT subqueries on `post_likes` execute per-page-load across many posts. At scale, this adds measurable latency. Mitigation: denormalized `like_count` column with increment/decrement on like/unlike. Single migration + 2 route changes.

2. **Comment volume on popular posts** -- If a single post gets hundreds of comments, loading them all at once becomes slow. Mitigation: cursor-paginate comments (same `created_at|id` pattern used in feeds). Not needed initially given the platform's scale.

## Build Order (Dependency-Driven)

This ordering reflects actual code dependencies -- each phase can be built and tested independently, and each phase leaves the system in a working state.

### Phase 1: Schema + Status Filtering (Foundation)

Migration 5 (new tables + status columns) + add `WHERE p.status = 'published'` to all 10 public query sites + `requireContributor` middleware + extract `batchLoadPostData` to shared module.

**Why first:** Everything else depends on the schema existing and public queries not leaking drafts. This is the safety net.

**Test:** All existing behavior unchanged. All current posts have `status = 'published'` by default. Feed, browse, search, RSS all work as before.

### Phase 2: Reader Accounts

`/register-reader` endpoint + ReaderRegister page + AuthContext role helpers + Navbar conditional rendering + ContributorRoute component.

**Why second:** Likes and comments require authenticated users. Reader accounts must exist before engagement features.

**Test:** Reader can sign up, log in, browse posts. Cannot create posts or access admin panel. Contributors still use existing invite flow.

### Phase 3: Likes

Like/unlike endpoints + LikeButton component + batch-loaded like counts in all feed/browse queries.

**Why third:** Simplest engagement feature. Single button + count. Good proving ground for reader auth flow.

**Test:** Reader likes a post, count increments. Unlike decrements. One like per user per post enforced. Counts visible in feed to all visitors.

### Phase 4: Comments

Comment CRUD endpoints + CommentSection component on ViewPost.

**Why fourth:** More complex than likes (text input, sanitization, moderation, display list). Builds on reader auth proven in Phase 3.

**Test:** Reader comments on a post. Post author can delete comments. Admin can delete any comment. Comment count visible.

### Phase 5: Drafts + Post Editing (Status Management)

Status param in create/update + Drafts page + PostForm status selector + draft preview via `optionalAuth` on GET /:slug.

**Why fifth:** Only affects contributors, not readers. Independent of engagement features. Schema from Phase 1 is already in place.

**Test:** Contributor saves a draft. Draft appears in /drafts but not in public feed. Contributor publishes draft -- it appears in feed. Contributor unpublishes -- it disappears.

### Phase 6: Scheduled Publishing

Schedule date picker in PostForm + server-side scheduler + scheduled status handling.

**Why last:** Depends on the draft/status system from Phase 5. Smallest scope -- a date picker + a `setInterval` function.

**Test:** Contributor schedules a post for 2 minutes from now. Post does not appear in feed. After scheduler fires, post appears.

## Sources

- Existing codebase analysis: `server/db/index.js`, `server/routes/*.js`, `server/middleware/auth.js`, `client/src/**/*.jsx` -- all patterns derived from what is already built (HIGH confidence)
- SQLite ALTER TABLE with DEFAULT behavior -- well-documented, existing rows get the default value (HIGH confidence)
- Express middleware chaining -- established patterns used throughout existing codebase (HIGH confidence)
- setInterval for background tasks in single-process Node.js -- standard approach, used in production by many small-to-medium apps (HIGH confidence)
- Composite PK `(post_id, user_id)` for likes -- same pattern proven in Backyard Marquee's `lineup_likes` table (HIGH confidence)

---
*Architecture research for: v2.1 Reader Engagement & Editorial*
*Researched: 2026-02-28*
