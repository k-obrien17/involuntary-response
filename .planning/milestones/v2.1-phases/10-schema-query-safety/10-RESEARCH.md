# Phase 10: Schema & Query Safety - Research

**Researched:** 2026-02-28
**Domain:** Database schema migration, status-filtered queries, batch-load helper extraction (Express/Turso/libSQL)
**Confidence:** HIGH

## Summary

Phase 10 is cross-cutting infrastructure that establishes the safety net for all subsequent v2.1 phases. It adds `status` and `published_at` columns to the `posts` table, creates `post_likes` and `post_comments` tables, applies `AND p.status = 'published'` filtering to every public query site, extracts a shared `batchLoadPostData` helper to eliminate code duplication, and switches feed cursor pagination from `created_at` to `published_at`. None of this requires new dependencies -- it is pure migration, query modification, and code extraction using the existing Turso/@libsql stack.

The critical risk is completeness: there are 14 query sites across 5 route files plus the RSS feed that touch the `posts` table. Missing even one allows unpublished content to leak into public surfaces. The research below provides an exhaustive audit of every query site, the exact SQL modifications needed, and the extraction strategy for the shared helper module. The migration itself is instant on Turso/SQLite because `ALTER TABLE ADD COLUMN ... DEFAULT` stores the default in the schema rather than rewriting existing rows.

**Primary recommendation:** Treat this as a systematic query audit phase, not a feature phase. Every deliverable is verified by checking that a manually-inserted `status = 'draft'` row does NOT appear in any public endpoint.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @libsql/client | (existing) | Turso database driver | Already in use; `db.exec()` runs multi-statement migrations via `executeMultiple` |
| Express 5 | (existing) | HTTP server | All route modifications are additive WHERE clauses |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| feed | (existing) | RSS feed generation | feed.js already uses it; query change only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Explicit `AND p.status = 'published'` in each query | SQLite VIEW `published_posts` | VIEW hides the filter, makes queries harder to grep; explicit is better for 14 sites |
| `published_at` column | Reuse `created_at` for feed ordering | Breaks when draft-then-publish: post would be buried in feed at draft creation time |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure

```
server/
  lib/
    post-helpers.js       # NEW: shared batchLoadPostData + formatPosts extracted from browse.js
  routes/
    posts.js              # MODIFIED: status filter on GET /, optionalAuth on GET /:slug
    browse.js             # MODIFIED: status filter on 6 queries, import shared helpers
    feed.js               # MODIFIED: status filter + published_at ordering
    search.js             # MODIFIED: status filter, import shared helpers
    profile.js            # MODIFIED: status filter, import shared helpers
  middleware/
    auth.js               # MODIFIED: add requireContributor export
  db/
    index.js              # MODIFIED: append migration 5
```

### Pattern 1: Status-Filtered Public Queries
**What:** Every SQL query that returns posts to unauthenticated visitors must include `AND p.status = 'published'`.
**When to use:** Every public-facing GET endpoint that selects from the `posts` table.
**Example:**
```sql
-- Source: derived from codebase audit of server/routes/posts.js line 124
-- BEFORE:
SELECT p.id, p.slug, p.body, p.author_id, p.created_at, p.updated_at, ...
FROM posts p JOIN users u ON p.author_id = u.id
WHERE (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
ORDER BY p.created_at DESC, p.id DESC

-- AFTER:
SELECT p.id, p.slug, p.body, p.author_id, p.created_at, p.updated_at, p.published_at, ...
FROM posts p JOIN users u ON p.author_id = u.id
WHERE p.status = 'published'
  AND (p.published_at < ? OR (p.published_at = ? AND p.id < ?))
ORDER BY p.published_at DESC, p.id DESC
```

### Pattern 2: Single-Post Author Preview
**What:** `GET /posts/:slug` must show drafts to their author but return 404 to everyone else.
**When to use:** The single-post detail endpoint only.
**Example:**
```javascript
// Source: derived from architecture research + server/routes/posts.js line 270
// Currently: router.get('/:slug', async (req, res) => { ... })
// Change to: router.get('/:slug', optionalAuth, async (req, res) => { ... })

const post = await db.get(
  `SELECT p.id, p.slug, p.body, p.author_id, p.status, p.created_at, p.updated_at, p.published_at, ...
   FROM posts p JOIN users u ON p.author_id = u.id
   WHERE p.slug = ?`,
  req.params.slug
);

if (!post) return res.status(404).json({ error: 'Post not found' });

// Non-published posts visible only to their author
if (post.status !== 'published' && (!req.user || req.user.id !== post.author_id)) {
  return res.status(404).json({ error: 'Post not found' });
}
```

### Pattern 3: Shared Batch-Load Helper Extraction
**What:** Extract `batchLoadPostData` + `formatPosts` + `parseCursor` from `browse.js` into `server/lib/post-helpers.js`, then import in all files that batch-load post data.
**When to use:** Any route that returns a list of posts with embeds, tags, and artists.
**Why now:** The same `batchLoadPostData` function is currently duplicated in `browse.js` and `search.js`, with a manual inline copy in `posts.js` and `profile.js`. Extracting it now (a) eliminates 4 copies of the same code, (b) provides a single place to add `likeCount` and `commentCount` batch-loading in Phase 12/13, and (c) ensures all routes return the same response shape.

**Example:**
```javascript
// server/lib/post-helpers.js
import { createHash } from 'crypto';
import db from '../db/index.js';

const emailHash = (email) =>
  createHash('md5').update(email.trim().toLowerCase()).digest('hex');

export async function batchLoadPostData(postIds) {
  const embedMap = {};
  const tagMap = {};
  const artistMap = {};

  if (postIds.length === 0) return { embedMap, tagMap, artistMap };

  const ph = postIds.map(() => '?').join(',');

  const embeds = await db.all(
    `SELECT post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html
     FROM post_embeds WHERE post_id IN (${ph})`,
    ...postIds
  );
  for (const e of embeds) {
    embedMap[e.post_id] = {
      provider: e.provider,
      embedType: e.embed_type,
      embedUrl: e.embed_url,
      originalUrl: e.original_url,
      title: e.title,
      thumbnailUrl: e.thumbnail_url,
      embedHtml: e.embed_html,
    };
  }

  const tags = await db.all(
    `SELECT post_id, tag FROM post_tags WHERE post_id IN (${ph}) ORDER BY tag`,
    ...postIds
  );
  for (const t of tags) {
    (tagMap[t.post_id] ||= []).push(t.tag);
  }

  const artistRows = await db.all(
    `SELECT post_id, artist_name, spotify_id FROM post_artists WHERE post_id IN (${ph})`,
    ...postIds
  );
  for (const a of artistRows) {
    (artistMap[a.post_id] ||= []).push({
      name: a.artist_name,
      spotifyId: a.spotify_id,
    });
  }

  return { embedMap, tagMap, artistMap };
}

export function formatPosts(rows, embedMap, tagMap, artistMap) {
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    body: p.body,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    publishedAt: p.published_at,
    author: {
      displayName: p.author_display_name,
      username: p.author_username,
      emailHash: emailHash(p.author_email),
    },
    embed: embedMap[p.id] || null,
    tags: tagMap[p.id] || [],
    artists: artistMap[p.id] || [],
  }));
}

export function parseCursor(cursor) {
  if (!cursor) return { cursorClause: '', cursorParams: [] };
  const [cursorDate, cursorId] = cursor.split('|');
  return {
    cursorClause: 'AND (p.published_at < ? OR (p.published_at = ? AND p.id < ?))',
    cursorParams: [cursorDate, cursorDate, parseInt(cursorId)],
  };
}
```

### Pattern 4: requireContributor Middleware
**What:** New middleware export in `auth.js` that checks for contributor or admin role.
**When to use:** Protecting post creation, editing, and deletion routes from reader access (Phase 11+).
**Example:**
```javascript
// server/middleware/auth.js -- new export
export function requireContributor(req, res, next) {
  if (!req.user || (req.user.role !== 'contributor' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Contributor access required' });
  }
  next();
}
```

### Anti-Patterns to Avoid
- **Partial query audit:** Do NOT add the status filter to "the obvious ones" and assume the rest are fine. The explore endpoint alone has 3 separate queries that join posts -- all 3 need the filter.
- **Two separate migrations:** Do NOT split schema changes across multiple migrations. Turso's `executeMultiple` handles multi-statement SQL. One migration with all 4 changes (2 ALTER TABLE + 2 CREATE TABLE + indexes) is safer than risking a partial state.
- **Backfill with UPDATE:** Do NOT run `UPDATE posts SET status = 'published'` for existing rows. SQLite's `ALTER TABLE ADD COLUMN ... DEFAULT 'published'` stores the default in the schema; existing rows automatically return `'published'` without any data write. An UPDATE would rewrite every row for zero benefit.
- **Using `created_at` for cursor after adding `published_at`:** The cursor MUST switch to `published_at` for public feeds. A post drafted today and published next week should appear at the top of the feed at publish time, not buried a week deep.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Batch post data loading | Inline embed/tag/artist queries in each route file | Shared `batchLoadPostData` in `server/lib/post-helpers.js` | Already duplicated in 4 files; adding like/comment counts later means changing 4 places vs 1 |
| Response shape formatting | Manual `.map()` in each route | Shared `formatPosts` helper | Consistent camelCase response shape across all endpoints |
| Cursor pagination parsing | Inline cursor split in each route | Shared `parseCursor` helper | Must change from `created_at` to `published_at` everywhere; single source of truth |
| Role-based access control | `if (req.user.role === 'contributor')` checks inline | `requireContributor` middleware | Consistent 403 response, reusable across routes |

**Key insight:** This phase is about establishing shared infrastructure so Phases 11-14 don't duplicate effort. Every helper extracted now saves 3-4 copy-paste sites later.

## Common Pitfalls

### Pitfall 1: Missing a Query Site (Draft Leak)
**What goes wrong:** A draft post appears in a public endpoint because `AND p.status = 'published'` was not added to one of the 14 query sites.
**Why it happens:** The query sites are spread across 5 route files plus the RSS feed. The explore endpoint alone has 3 separate queries that join posts. It's easy to miss one.
**How to avoid:** Use the exhaustive query audit below. After implementation, insert a `status = 'draft'` test row and verify it does NOT appear in ANY of the 14 endpoints.
**Warning signs:** A post with `status = 'draft'` appearing in the feed, RSS, search, browse-by-tag, browse-by-artist, browse-by-contributor, explore, or profile.

### Pitfall 2: Cursor Pagination Breaking After published_at Switch
**What goes wrong:** Clients holding an old cursor (based on `created_at`) get incorrect or empty results after the server switches to `published_at`.
**Why it happens:** Existing cursors are formatted as `{created_at}|{id}`. If the server starts interpreting the date field as `published_at`, old cursors become invalid.
**How to avoid:** Since `published_at` is set to `created_at` for all existing posts (via the migration backfill), existing cursor values remain valid. The values are identical for all pre-migration posts. New posts created in later phases will have `published_at` set explicitly on publish. No client-side change is needed.
**Warning signs:** Feed returning duplicate or missing posts after migration.

### Pitfall 3: Turso executeMultiple with ALTER TABLE
**What goes wrong:** The migration fails because `executeMultiple` cannot handle certain statement combinations.
**Why it happens:** Turso's `executeMultiple` sends all statements in a single batch. Some combinations of DDL statements may not work as expected.
**How to avoid:** The existing migration pattern uses `db.exec()` which calls `client.executeMultiple()`. Migrations 1 and 3 already successfully use multi-statement SQL with CREATE TABLE + CREATE INDEX + ALTER TABLE. Follow the same pattern. If a failure occurs, the migration runner's try/catch with `already exists` / `duplicate column` guards (line 183-185 of db/index.js) handles partial application.
**Warning signs:** Migration error on startup. The existing error handling will log the error and allow safe re-runs.

### Pitfall 4: Explore Endpoint Leaking Draft Metadata
**What goes wrong:** Draft posts contribute to the explore endpoint's "popular tags", "top artists", or "active contributors" aggregations, inflating counts with unpublished content.
**Why it happens:** The explore endpoint has 3 separate `JOIN posts` queries (lines 236, 244, 253 of browse.js). All 3 need `AND p.status = 'published'` but they are easy to overlook because they are aggregate queries, not post-list queries.
**How to avoid:** Add `WHERE p.status = 'published'` to all 3 explore queries. The tags query becomes `JOIN posts p ON pt.post_id = p.id WHERE p.status = 'published'`, same for artists and contributors.
**Warning signs:** Tag or artist counts that don't match the actual number of visible published posts.

### Pitfall 5: OG Function Exposing Draft Content
**What goes wrong:** The Vercel OG function at `client/api/og.js` fetches `GET /api/posts/:slug` which currently returns any post regardless of status. Social crawlers could see draft metadata.
**Why it happens:** The OG function is a Vercel serverless function, separate from the main server. It calls the API endpoint, which will now return 404 for drafts (after the single-post GET is modified to use `optionalAuth`). Since the OG function does not pass an auth token, it correctly gets a 404 for drafts and falls back to default metadata.
**How to avoid:** No change needed in the OG function itself -- the fix is on the API side. When `GET /posts/:slug` returns 404 for drafts (no auth), the OG function's existing fallback logic handles it correctly. Verify this during testing.
**Warning signs:** OG preview showing draft content on social platforms.

### Pitfall 6: NOT NULL Constraint on published_at
**What goes wrong:** Using `NOT NULL` on the `published_at` column prevents future draft creation (drafts should have `published_at = NULL`).
**Why it happens:** If the migration uses `NOT NULL DEFAULT CURRENT_TIMESTAMP`, all future inserts must provide a value.
**How to avoid:** Make `published_at` nullable. Existing rows get backfilled via an UPDATE in the migration. New drafts will have `published_at = NULL`. The value is set when a post transitions to `published` status.
**Warning signs:** INSERT failures when creating drafts in Phase 14.

## Code Examples

### Migration 5: Complete Schema Change
```sql
-- Source: derived from codebase audit of server/db/index.js
-- Migration ID: 5, name: 'add_post_status_likes_comments'

-- Add status column (default 'published' — existing rows auto-get this value)
ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published';

-- Add published_at column (nullable — drafts will have NULL)
ALTER TABLE posts ADD COLUMN published_at DATETIME;

-- Backfill published_at for existing published posts
UPDATE posts SET published_at = created_at WHERE published_at IS NULL;

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);
```

**Notes:**
- `status TEXT NOT NULL DEFAULT 'published'` -- SQLite stores the default in the schema. Existing rows return `'published'` at read time without a physical rewrite. Instant regardless of table size.
- `published_at DATETIME` -- Nullable. The `UPDATE posts SET published_at = created_at` backfill is needed because the column has no default; without it, `published_at` would be NULL for existing rows and break cursor pagination.
- `post_likes` uses composite PK `(post_id, user_id)` -- enforces one like per user per post at the DB level. Same pattern as Backyard Marquee's `lineup_likes`.
- `post_comments` is flat (no `parent_id`) -- per REQUIREMENTS.md, threaded comments are out of scope.
- `ON DELETE CASCADE` on both tables -- when a post or user is deleted, their likes/comments are automatically cleaned up.

### Feed Cursor Migration (posts.js GET /)
```javascript
// Source: derived from server/routes/posts.js lines 115-219
// BEFORE: cursor based on created_at
// AFTER: cursor based on published_at

// In the paginated query:
// Old: WHERE (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
// New: WHERE p.status = 'published' AND (p.published_at < ? OR (p.published_at = ? AND p.id < ?))

// Old cursor generation:
// const nextCursor = hasMore && lastPost ? `${lastPost.created_at}|${lastPost.id}` : null;
// New cursor generation:
// const nextCursor = hasMore && lastPost ? `${lastPost.published_at}|${lastPost.id}` : null;

// Old ORDER BY: p.created_at DESC, p.id DESC
// New ORDER BY: p.published_at DESC, p.id DESC
```

### RSS Feed Status Filter (feed.js)
```javascript
// Source: derived from server/routes/feed.js lines 22-28
// BEFORE:
const posts = await db.all(
  `SELECT p.id, p.slug, p.body, p.created_at, ...
   FROM posts p JOIN users u ON p.author_id = u.id
   ORDER BY p.created_at DESC LIMIT 20`
);

// AFTER:
const posts = await db.all(
  `SELECT p.id, p.slug, p.body, p.created_at, p.published_at, ...
   FROM posts p JOIN users u ON p.author_id = u.id
   WHERE p.status = 'published'
   ORDER BY p.published_at DESC LIMIT 20`
);

// Also update the feed item date:
// Old: date: new Date(post.created_at),
// New: date: new Date(post.published_at || post.created_at),
```

## Exhaustive Query Audit

Every SQL query that touches the `posts` table, with the required modification.

### posts.js (4 query sites)

| # | Endpoint | Line | Current Query | Required Change |
|---|----------|------|---------------|-----------------|
| 1 | `GET /` (feed) | 123-131, 134-140 | No status filter, cursor on `created_at` | Add `WHERE p.status = 'published'`, switch cursor to `published_at` |
| 2 | `GET /:slug` (single) | 272-278 | No status filter, no auth | Add `optionalAuth`, check `post.status !== 'published'` for non-author |
| 3 | `PUT /:slug` (update) | 338 | `SELECT id, author_id FROM posts WHERE slug = ?` | No status filter needed (author access only, behind `authenticateToken`) |
| 4 | `DELETE /:slug` (delete) | 394 | `SELECT id, author_id FROM posts WHERE slug = ?` | No status filter needed (author access only, behind `authenticateToken`) |

### browse.js (6 query sites)

| # | Endpoint | Line | Current Query | Required Change |
|---|----------|------|---------------|-----------------|
| 5 | `GET /tag/:tag` | 101-110 | `JOIN post_tags pt ON pt.post_id = p.id WHERE pt.tag = ?` | Add `AND p.status = 'published'`, switch cursor to `published_at` |
| 6 | `GET /artist/:name` | 146-155 | `JOIN post_artists pa ON pa.post_id = p.id WHERE pa.artist_name = ?` | Add `AND p.status = 'published'`, switch cursor to `published_at` |
| 7 | `GET /contributor/:username` | 196-204 | `WHERE p.author_id = ?` | Add `AND p.status = 'published'`, switch cursor to `published_at` |
| 8a | `GET /explore` (tags) | 235-240 | `JOIN posts p ON pt.post_id = p.id GROUP BY pt.tag` | Add `WHERE p.status = 'published'` |
| 8b | `GET /explore` (artists) | 244-249 | `JOIN posts p ON pa.post_id = p.id GROUP BY pa.artist_name` | Add `WHERE p.status = 'published'` |
| 8c | `GET /explore` (contributors) | 253-261 | `JOIN posts p ON u.id = p.author_id WHERE u.is_active = 1` | Add `AND p.status = 'published'` |

### feed.js (1 query site)

| # | Endpoint | Line | Current Query | Required Change |
|---|----------|------|---------------|-----------------|
| 9 | `GET /` (RSS) | 22-28 | `ORDER BY p.created_at DESC LIMIT 20` | Add `WHERE p.status = 'published'`, order by `published_at` |

### search.js (1 query site)

| # | Endpoint | Line | Current Query | Required Change |
|---|----------|------|---------------|-----------------|
| 10 | `GET /` (search) | 105-122 | `WHERE (p.body LIKE ? ... OR u.username LIKE ?)` | Add `AND p.status = 'published'`, switch cursor to `published_at` |

### profile.js (1 query site)

| # | Endpoint | Line | Current Query | Required Change |
|---|----------|------|---------------|-----------------|
| 11 | `GET /:username/profile` | 30-36 | `WHERE p.author_id = ? ORDER BY p.created_at DESC` | Add `AND p.status = 'published'`, order by `published_at` |

### Vercel OG (1 indirect site)

| # | Endpoint | File | Current Behavior | Required Change |
|---|----------|------|------------------|-----------------|
| 12 | `GET /posts/:slug` | `client/api/og.js` | Fetches from API, uses defaults on failure | No change needed -- API returns 404 for drafts (no auth token), OG function falls back to defaults |

**Total: 14 query sites (11 direct SQL + 3 explore sub-queries + 1 indirect OG)**

## Shared Helper Extraction Plan

### Current Duplication

| File | Has `batchLoadPostData`? | Has `formatPosts`? | Has `parseCursor`? | Has `emailHash`? |
|------|--------------------------|--------------------|--------------------|------------------|
| `browse.js` | YES (lines 13-59) | YES (lines 64-79) | YES (lines 85-92) | YES (line 5) |
| `search.js` | YES (lines 13-59, identical copy) | YES (lines 64-79, identical copy) | YES (lines 84-91, identical copy) | YES (line 5) |
| `posts.js` | NO (inline batch-load, lines 148-192) | NO (inline formatting, lines 194-209) | NO (inline cursor parsing, lines 121-131) | YES (line 11) |
| `profile.js` | NO (inline batch-load, lines 42-84) | NO (inline formatting, lines 86-99) | NO | YES (line 5) |
| `feed.js` | NO (stripped-down inline, lines 38-47) | NO | NO | NO |

### Extraction Strategy

1. Create `server/lib/post-helpers.js` with `batchLoadPostData`, `formatPosts`, `parseCursor`, `emailHash`
2. Update `browse.js`: remove local functions, `import { batchLoadPostData, formatPosts, parseCursor, emailHash } from '../lib/post-helpers.js'`
3. Update `search.js`: remove local functions, import from shared module
4. Update `posts.js`: replace inline batch-load and formatting with imports from shared module
5. Update `profile.js`: replace inline batch-load and formatting with imports from shared module
6. `feed.js`: keep its own stripped-down query (only needs embed titles, not full batch-load). Add status filter only.

### What Changes in the Shared Helper

- `formatPosts` adds `publishedAt: p.published_at` to the response shape
- `parseCursor` switches from `p.created_at` to `p.published_at` for the cursor clause
- `batchLoadPostData` unchanged for now (like/comment counts added in Phases 12-13)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No post status concept | `status` column with `published` default | Phase 10 migration | Foundation for drafts, scheduling in Phase 14+ |
| Cursor on `created_at` | Cursor on `published_at` | Phase 10 migration | Correct feed ordering when posts are published after drafting |
| Duplicated batch-load in 4 files | Shared `post-helpers.js` module | Phase 10 extraction | Single place to add like/comment counts later |
| No likes/comments tables | `post_likes` + `post_comments` created | Phase 10 migration | Tables ready for Phases 12-13 |

## Open Questions

1. **Turso `executeMultiple` with mixed DDL (ALTER + CREATE + UPDATE)**
   - What we know: Existing migrations 1 and 3 successfully use multi-statement SQL with `db.exec()` (which calls `executeMultiple`). Migration 3 combines CREATE TABLE + CREATE INDEX + ALTER TABLE.
   - What's unclear: Migration 5 adds an UPDATE statement to the mix. We haven't verified that `executeMultiple` handles DDL + DML in the same batch.
   - Recommendation: If the combined migration fails, split into two migrations: (5a) ALTER TABLE + CREATE TABLE + indexes, (5b) UPDATE posts SET published_at = created_at. The migration runner handles this gracefully.

2. **Feed response shape backward compatibility**
   - What we know: Adding `publishedAt` to the response shape is additive. Existing clients ignore unknown fields.
   - What's unclear: Whether any client component relies on `createdAt` for display ordering (vs the server's ORDER BY).
   - Recommendation: Keep `createdAt` in the response alongside `publishedAt`. Client components that display dates should use `publishedAt || createdAt` as a fallback.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `server/routes/posts.js`, `server/routes/browse.js`, `server/routes/feed.js`, `server/routes/search.js`, `server/routes/profile.js`, `server/db/index.js`, `server/middleware/auth.js`, `server/middleware/admin.js`, `client/api/og.js` -- all query sites and patterns derived from direct code review
- [SQLite ALTER TABLE documentation](https://www.sqlite.org/lang_altertable.html) -- confirms `ADD COLUMN ... NOT NULL DEFAULT` is valid; default stored in schema, not physically written to existing rows; operation is instant regardless of table size

### Secondary (MEDIUM confidence)
- [Ghost CMS RSS feed bug #11266](https://github.com/TryGhost/Ghost/issues/11266) -- real-world precedent for draft content leaking into RSS feeds when status filter is missed
- Architecture research (`.planning/research/ARCHITECTURE.md`) -- schema design, component responsibilities, and data flow patterns verified against actual codebase

### Tertiary (LOW confidence)
- None. All findings in this research are derived from direct codebase inspection and official SQLite documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; pure migration + query modification on existing stack
- Architecture: HIGH -- every query site enumerated from direct code inspection with line numbers
- Pitfalls: HIGH -- all pitfalls derived from actual codebase structure (14 query sites identified) and real-world precedent (Ghost RSS leak)
- Migration safety: HIGH -- existing migrations 1-4 prove the `db.exec()` / `executeMultiple` pattern works; SQLite ALTER TABLE DEFAULT behavior confirmed via official docs

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable -- no external dependencies or fast-moving APIs)
