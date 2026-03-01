# Phase 14: Drafts & Post Editing - Research

**Researched:** 2026-03-01
**Domain:** Draft save/publish workflow, post editing, status transitions (Express/React/Turso)
**Confidence:** HIGH

## Summary

Phase 14 builds the contributor editorial workflow on top of infrastructure already established in Phase 10. The database already has `posts.status` (default `'published'`), `posts.published_at`, and `posts.updated_at` columns. The single-post endpoint (`GET /posts/:slug`) already returns drafts to their author and 404 to everyone else. The `POST /posts` endpoint currently hard-codes `status = 'published'` (implicitly, via the column default). The `PUT /posts/:slug` endpoint already exists with full embed/tag/artist replacement logic. This means the server-side work is primarily about (a) accepting a `status` parameter on create/update, (b) setting `published_at = CURRENT_TIMESTAMP` on publish transitions, (c) adding a "my drafts" list endpoint, and (d) returning `status`/`updatedAt`/`publishedAt` in responses so the client can render accordingly.

On the client side, the `PostForm` component already supports both create and edit modes via `initialData`. The `CreatePost` page calls `posts.create()` and redirects to the permalink; the `EditPost` page calls `posts.update()` and redirects back. The changes needed are: (a) add a "Save as draft" action alongside "Publish" in the create flow, (b) add a "My Drafts" / "My Posts" page accessible from the Navbar, (c) add a draft preview rendering that reuses ViewPost's display without public visibility, (d) add a "Publish" button on draft previews, (e) show an "edited" indicator when `updatedAt > publishedAt` on published posts, and (f) wire the edit flow from the post permalink for the author.

No new dependencies are required. This is entirely server logic (status transitions, a new endpoint) and client UI (draft list page, publish action, edited indicator). The existing stack handles everything.

**Primary recommendation:** Split into two plans: (1) server-side draft/publish/edit API changes, and (2) client-side draft management UI, preview, publish action, and edited indicator.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDIT-01 | Contributor can save a post as draft (not visible publicly) | Server: Accept `status: 'draft'` on `POST /posts`, skip setting `published_at`. Client: "Save as draft" button in PostForm. Drafts list endpoint `GET /posts/mine`. Phase 10 already filters drafts from all public surfaces. |
| EDIT-02 | Contributor can preview a draft before publishing | Client: Navigate to `/posts/:slug` -- the existing single-post endpoint already returns drafts to their author (Phase 10 Pattern 2). Render ViewPost normally for the author, with a "Draft" badge and "Publish" button. |
| EDIT-03 | Contributor can publish a draft | Server: `PUT /posts/:slug` with `status: 'published'` sets `published_at = CURRENT_TIMESTAMP`. Client: "Publish" button on draft view calls update endpoint. Post appears at top of feed at publish time (cursor uses `published_at`, established in Phase 10). |
| EDIT-04 | Contributor can edit a published post (content, embeds, tags) | Already partially implemented: `PUT /posts/:slug` exists with body/embedUrl/tags/artistName replacement. Needs: ensure `updated_at` is set on edit (already happens -- line 468 of posts.js). Client: EditPost page already exists at `/posts/:slug/edit`. |
| EDIT-05 | Edited posts show an "edited" indicator | Client: Compare `updatedAt` vs `publishedAt` (or `createdAt` for pre-migration posts). If `updatedAt > publishedAt`, show "edited" text. Server already returns both fields. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express 5 | (existing) | HTTP server | All route modifications are additive |
| React 18 | (existing) | UI components | PostForm, ViewPost, new DraftsPage |
| @libsql/client | (existing) | Turso database driver | All queries use existing `db` wrapper |
| React Router 6 | (existing) | Client routing | New `/my-posts` route |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | (existing) | Slug generation | Used in POST /posts for new drafts |
| react-textarea-autosize | (existing) | PostForm textarea | Already in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single `PUT /posts/:slug` for publish | Separate `POST /posts/:slug/publish` | Separate endpoint is cleaner semantically but adds another route; PUT with status change is simpler and consistent with existing update pattern |
| Dedicated `/my-posts` page | Drafts section on Profile page | Profile is public-facing; mixing private drafts into it breaks the mental model. Separate page is clearer. |
| `updated_at > published_at` for edited check | Separate `is_edited` column | Extra column is redundant; the timestamp comparison is reliable since `updated_at` is already set on every edit |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
server/
  routes/
    posts.js              # MODIFIED: accept status param on create, publish transition on update, GET /mine endpoint
  lib/
    post-helpers.js       # UNCHANGED (already returns updatedAt, publishedAt, status on single-post)

client/src/
  pages/
    CreatePost.jsx        # MODIFIED: add "Save as draft" action
    EditPost.jsx          # MODIFIED: handle draft vs published post states
    ViewPost.jsx          # MODIFIED: show draft badge, publish button, edited indicator
    MyPosts.jsx           # NEW: list contributor's drafts and published posts
  components/
    PostForm.jsx          # MODIFIED: accept onSaveDraft callback, show dual buttons
    Navbar.jsx            # MODIFIED: add "My Posts" link for contributors
  api/
    client.js             # MODIFIED: add posts.listMine() method
```

### Pattern 1: Status Transition on Server
**What:** The `POST /posts` endpoint accepts an optional `status` field (`'draft'` or `'published'`). If `'published'` (or omitted for backward compatibility), `published_at` is set to `CURRENT_TIMESTAMP`. If `'draft'`, `published_at` remains NULL. The `PUT /posts/:slug` endpoint detects a draft-to-published transition and sets `published_at` at that moment.
**When to use:** All create and update operations.
**Example:**
```javascript
// Source: derived from server/routes/posts.js POST / (line 160)
// Create with draft support
router.post('/', authenticateToken, requireContributor, createLimiter, async (req, res) => {
  const { embedUrl, tags } = req.body;
  const body = sanitize(req.body.body, 1200);
  const artistName = sanitize(req.body.artistName, 200);
  const status = req.body.status === 'draft' ? 'draft' : 'published';

  if (!body) {
    return res.status(400).json({ error: 'Post body is required' });
  }

  const slug = nanoid();

  // If publishing immediately, set published_at; if draft, leave NULL
  const result = await db.run(
    `INSERT INTO posts (slug, body, author_id, status, published_at)
     VALUES (?, ?, ?, ?, ${status === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
    slug, body, req.user.id, status
  );
  // ... embed, artist, tag handling unchanged ...
  res.status(201).json({ id: result.lastInsertRowid, slug, status });
});
```

### Pattern 2: Publish Transition (Draft to Published)
**What:** When updating a post, detect if the status is changing from `'draft'` to `'published'`. If so, set `published_at = CURRENT_TIMESTAMP`. This ensures the post appears at the top of the feed at its actual publish time, not its draft creation time.
**When to use:** PUT /posts/:slug when the request includes `status: 'published'` and the existing post has `status = 'draft'`.
**Example:**
```javascript
// Source: derived from server/routes/posts.js PUT /:slug (line 449)
router.put('/:slug', authenticateToken, requireContributor, updateLimiter, async (req, res) => {
  const post = await db.get('SELECT id, author_id, status FROM posts WHERE slug = ?', req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  const { embedUrl, tags } = req.body;
  const body = sanitize(req.body.body, 1200);
  const newStatus = req.body.status;

  // Determine if this is a publish transition
  const isPublishing = post.status === 'draft' && newStatus === 'published';

  // Build update query based on what changed
  if (isPublishing) {
    await db.run(
      'UPDATE posts SET body = ?, status = ?, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      body, 'published', post.id
    );
  } else {
    await db.run(
      'UPDATE posts SET body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      body, post.id
    );
  }
  // ... embed, artist, tag replacement unchanged ...
});
```

### Pattern 3: My Posts Endpoint (Contributor's Own Posts)
**What:** A new `GET /posts/mine` endpoint that returns all posts (drafts and published) for the authenticated contributor, ordered by `created_at DESC`. This is separate from the public feed (which only shows published posts) and the profile page (which also only shows published posts).
**When to use:** The "My Posts" page in the contributor UI.
**Example:**
```javascript
// Source: new endpoint, follows existing pattern from profile.js
// IMPORTANT: Must be registered BEFORE the /:slug route to avoid slug conflict
router.get('/mine', authenticateToken, requireContributor, async (req, res) => {
  const rows = await db.all(
    `SELECT p.id, p.slug, p.body, p.status, p.created_at, p.updated_at, p.published_at,
            u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
     FROM posts p
     JOIN users u ON p.author_id = u.id
     WHERE p.author_id = ?
     ORDER BY p.created_at DESC`,
    req.user.id
  );

  const postIds = rows.map((p) => p.id);
  const { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap } = await batchLoadPostData(postIds, req.user.id);

  // Format with status included
  const posts = rows.map((p) => ({
    ...formatPosts([p], embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap)[0],
    status: p.status,
  }));

  res.json({ posts });
});
```

### Pattern 4: Edited Indicator (Client-Side)
**What:** Compare `updatedAt` and `publishedAt` timestamps. If `updatedAt` is later than `publishedAt`, show "(edited)" text near the post date. Only applies to published posts (drafts are expected to be edited before publishing).
**When to use:** ViewPost permalink page and PostCard feed cards.
**Example:**
```jsx
// Source: derived from client/src/pages/ViewPost.jsx
// After the date display:
{post.status === 'published' && post.updatedAt && post.publishedAt &&
  new Date(post.updatedAt) > new Date(post.publishedAt) && (
    <span className="text-gray-400 dark:text-gray-500 text-sm"> (edited)</span>
)}
```

### Pattern 5: Route Order in posts.js
**What:** Express matches routes in registration order. The new `GET /mine` must be registered BEFORE `GET /:slug`, otherwise Express would match "mine" as a slug parameter.
**When to use:** When adding any named route alongside a parameterized route in the same router.
**Example:**
```javascript
// CORRECT ORDER:
router.get('/', optionalAuth, async (req, res) => { /* feed */ });
router.get('/mine', authenticateToken, requireContributor, async (req, res) => { /* my posts */ });
router.get('/:slug', optionalAuth, async (req, res) => { /* single post */ });
```

### Anti-Patterns to Avoid
- **Setting published_at on draft creation:** Drafts MUST have `published_at = NULL`. Setting it to `created_at` would cause the post to appear buried in the feed (at its draft creation time) when eventually published, instead of at the top.
- **Allowing status changes on published posts back to draft:** Once published, a post should not be unpublished. This creates confusion for readers who already liked/commented. The API should reject `status: 'draft'` on an already-published post.
- **Separate preview endpoint:** No need for a `/posts/:slug/preview` route. The existing `GET /posts/:slug` already returns drafts to their author (Phase 10). The client just renders ViewPost normally and adds a "Publish" button.
- **Modifying formatPosts to include status:** The `formatPosts` helper is used by all public-facing endpoints. Adding `status` to it would leak draft metadata into public responses. Instead, add `status` only in the `/mine` endpoint response and the single-post `GET /:slug` response (which already includes it).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Draft visibility filtering | Custom middleware to hide drafts per-route | Existing `AND p.status = 'published'` filters (Phase 10) | Already applied to all 14 query sites; no new filtering needed |
| Post response formatting | New formatting logic for drafts | Existing `formatPosts` + `batchLoadPostData` helpers | Already returns updatedAt and publishedAt; just add status where needed |
| Route protection for contributor features | Inline role checks | Existing `requireContributor` middleware | Already used on POST, PUT, DELETE routes |
| Edited state tracking | Separate `is_edited` boolean column | `updatedAt > publishedAt` comparison | Already have both timestamps; no schema change needed |
| Autosave | Timer-based auto-save to server | Manual "Save draft" button | Per REQUIREMENTS.md Out of Scope: "Posts are ~800 chars; manual save is fine" |

**Key insight:** Phase 10 already did the hard work of establishing the status column, filtering all public queries, and adding `published_at` with cursor support. Phase 14 is purely about exposing the draft workflow to contributors and adding the edited indicator -- no new infrastructure is needed.

## Common Pitfalls

### Pitfall 1: GET /mine vs GET /:slug Route Collision
**What goes wrong:** Express interprets `GET /posts/mine` as `GET /posts/:slug` with `slug = "mine"`, returning 404 because no post has slug "mine".
**Why it happens:** Express matches routes in registration order. If `/:slug` is registered before `/mine`, the parameterized route matches first.
**How to avoid:** Register `GET /mine` BEFORE `GET /:slug` in the router. The current route order in posts.js is: `GET /` (feed), then `GET /:slug`. Insert `GET /mine` between them.
**Warning signs:** Navigating to "My Posts" returns "Post not found" instead of the drafts list.

### Pitfall 2: published_at Set on Draft Save (Feed Burial)
**What goes wrong:** A post drafted today and published next week appears buried in the feed at today's position instead of at the top.
**Why it happens:** If `published_at` is set to `CURRENT_TIMESTAMP` on draft creation, the cursor pagination (which uses `published_at`) places it at the draft creation date.
**How to avoid:** Only set `published_at` when `status = 'published'`. Drafts have `published_at = NULL`. On publish transition, set `published_at = CURRENT_TIMESTAMP`.
**Warning signs:** Newly published posts not appearing at the top of the feed.

### Pitfall 3: updated_at Reset on Publish (False "edited" Indicator)
**What goes wrong:** Publishing a draft sets `updated_at = CURRENT_TIMESTAMP` alongside `published_at = CURRENT_TIMESTAMP`. If these timestamps are even slightly different (millisecond precision), the edited indicator triggers on a brand-new post.
**How to avoid:** Set both `updated_at` and `published_at` in the same SQL statement so they get the same `CURRENT_TIMESTAMP` value. SQLite's `CURRENT_TIMESTAMP` is evaluated once per statement, so both columns receive the identical value. Alternatively, only show "edited" when `updatedAt` is at least 60 seconds after `publishedAt` to absorb any edge cases.
**Warning signs:** Freshly published posts showing "(edited)" immediately.

### Pitfall 4: Stale PostForm State After Save-as-Draft
**What goes wrong:** Contributor saves a draft, PostForm state is not reset, they modify and save again -- the second save creates a new post instead of updating the existing draft.
**Why it happens:** `CreatePost` page calls `posts.create()`. After saving a draft, the contributor is still on the "create" page, not the "edit" page.
**How to avoid:** After saving a draft, redirect to `/posts/:slug/edit` (or `/posts/:slug`) so subsequent edits go through the update flow, not create. This matches the existing pattern where creating a published post redirects to the permalink.
**Warning signs:** Duplicate draft posts appearing in "My Posts".

### Pitfall 5: Allowing Unpublish of Published Posts
**What goes wrong:** Contributor changes a published post's status back to "draft", removing it from the feed. Readers who liked or commented see the post disappear. External links break.
**Why it happens:** The PUT endpoint accepts any status value without validating the transition.
**How to avoid:** Reject `status: 'draft'` when the existing post status is `'published'`. Once published, a post can be edited but not unpublished. (If takedown is needed, delete is the mechanism.)
**Warning signs:** Posts disappearing from the feed after being edited.

### Pitfall 6: Draft Embed Resolution on Every Save
**What goes wrong:** Saving a draft triggers oEmbed resolution, which makes external API calls and is slow. Contributors save drafts frequently while iterating.
**Why it happens:** The existing create/update flow always resolves embeds.
**How to avoid:** This is actually fine for this app. Posts have at most one embed, and resolution is cached/fast for repeat URLs. The existing flow handles this efficiently. No change needed.
**Warning signs:** None expected -- this is a non-issue for the current scale.

## Code Examples

Verified patterns from direct codebase inspection:

### Current Create Flow (to be modified)
```javascript
// Source: server/routes/posts.js line 160-204
// Current: Always creates as published (status defaults to 'published' via column default)
router.post('/', authenticateToken, requireContributor, createLimiter, async (req, res) => {
  const slug = nanoid();
  const result = await db.run(
    'INSERT INTO posts (slug, body, author_id) VALUES (?, ?, ?)',
    slug, body, req.user.id
  );
  // Since status defaults to 'published' and published_at is NULL,
  // but the migration backfill already set published_at = created_at for existing rows.
  // NEW posts created after migration will have published_at = NULL unless explicitly set.
  // This is a bug for the "Publish" flow -- must explicitly set published_at.
});
```

**Critical finding:** The current `POST /posts` does NOT set `published_at`. It relies on the column being nullable and the migration having backfilled existing rows. For new posts created after Phase 10, `published_at` will be NULL even though `status` defaults to `'published'`. The `parseCursor` and RSS feed use `published_at` for ordering, so posts with `published_at = NULL` would sort incorrectly. This must be fixed: set `published_at = CURRENT_TIMESTAMP` when creating a published post.

### Current Update Flow (to be extended)
```javascript
// Source: server/routes/posts.js line 449-502
// Current: Updates body, replaces embed/tags/artists, sets updated_at
router.put('/:slug', authenticateToken, requireContributor, updateLimiter, async (req, res) => {
  // Checks author ownership
  // Updates body + updated_at
  // Replaces embed, artists, tags
  // Returns { id, slug }
});
// Needs: accept status param, detect publish transition, set published_at
```

### Current Single-Post Response (already includes status)
```javascript
// Source: server/routes/posts.js line 411-441
// Already returns: status, publishedAt, updatedAt
res.json({
  id: post.id,
  slug: post.slug,
  body: post.body,
  authorId: post.author_id,
  status: post.status,         // Already present
  createdAt: post.created_at,
  updatedAt: post.updated_at,  // Already present
  publishedAt: post.published_at, // Already present
  // ... embed, tags, artists, likes, comments ...
});
```

### Existing PostForm Dual Button Pattern
```jsx
// Source: client/src/components/PostForm.jsx line 78-88
// Current: Shows "Publish" for create, "Save changes" for edit
<button type="submit" disabled={isDisabled}>
  {submitting ? 'Saving...' : initialData ? 'Save changes' : 'Publish'}
</button>
// Needs: Additional "Save as draft" button for create mode
// For edit mode on drafts: "Save draft" + "Publish" dual buttons
```

### API Client Pattern for New Endpoint
```javascript
// Source: client/src/api/client.js line 43-52
// Existing pattern to follow:
export const posts = {
  list: (params) => api.get('/posts', { params }),
  create: (data) => api.post('/posts', data),
  getBySlug: (slug) => api.get(`/posts/${slug}`),
  update: (slug, data) => api.put(`/posts/${slug}`, data),
  delete: (slug) => api.delete(`/posts/${slug}`),
  // ADD:
  listMine: () => api.get('/posts/mine'),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All posts published on create | Status column with draft support | Phase 10 (schema), Phase 14 (workflow) | Contributors can iterate before publishing |
| No edited indicator | `updatedAt > publishedAt` comparison | Phase 14 | Readers know content was modified post-publication |
| Edit only from permalink "Edit" link | Edit from both permalink and "My Posts" list | Phase 14 | Easier to find and manage draft and published posts |

**Already established (Phase 10 infrastructure):**
- `posts.status` column (default `'published'`), indexed
- `posts.published_at` column (nullable), indexed DESC
- All 14 public query sites filter by `p.status = 'published'`
- Single-post `GET /:slug` returns drafts to author, 404 to others
- Feed cursor uses `published_at` (not `created_at`)
- `formatPosts` includes `updatedAt` and `publishedAt` fields

## Open Questions

1. **published_at NULL on new published posts (bug)**
   - What we know: The current `POST /posts` does not set `published_at`. The column has no DEFAULT. New published posts created after Phase 10's migration will have `published_at = NULL`.
   - What's unclear: Whether any posts were created between Phase 10 deployment and now that have `published_at = NULL`. The feed uses `published_at DESC` for ordering -- NULL values sort differently in SQLite (NULLS appear last in DESC order).
   - Recommendation: Fix in Phase 14 by explicitly setting `published_at = CURRENT_TIMESTAMP` in the INSERT for published posts. Also add a safety backfill in the same code change: `UPDATE posts SET published_at = created_at WHERE status = 'published' AND published_at IS NULL`. This handles any posts created between Phase 10 and Phase 14.

2. **Should "My Posts" show published posts too, or just drafts?**
   - What we know: Success criterion 1 says "find it later in a drafts/my-posts view". The wording suggests a combined view.
   - What's unclear: Whether the page should have tabs (Drafts / Published) or a single mixed list with status badges.
   - Recommendation: Single list with status badges, drafts first. The contributor pool is small (single-digit contributors), so the list is short. No pagination needed. Drafts at top (by created_at DESC), published below (by published_at DESC). This avoids tab complexity for a simple use case.

3. **Can the contributor edit the embed URL on a published post?**
   - What we know: EDIT-04 says "content, embeds, and tags". The existing PUT endpoint already replaces embeds. The `extractAndInsertArtists` function re-runs on update.
   - What's unclear: Whether changing the embed should trigger a full re-extraction of artists (it currently does on PUT).
   - Recommendation: Keep existing behavior. The PUT endpoint already handles embed replacement with artist re-extraction. No change needed.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `server/routes/posts.js` -- direct inspection of POST / (line 160), PUT /:slug (line 449), GET /:slug (line 333), GET / (line 125). All route patterns, middleware chains, and response shapes derived from code.
- Existing codebase: `server/lib/post-helpers.js` -- confirmed `formatPosts` returns `updatedAt`, `publishedAt`; `parseCursor` uses `published_at`.
- Existing codebase: `server/db/index.js` -- migration 5 confirmed: `status TEXT NOT NULL DEFAULT 'published'`, `published_at DATETIME` (nullable).
- Existing codebase: `client/src/components/PostForm.jsx` -- confirmed `initialData` pattern, dual-mode create/edit button text.
- Existing codebase: `client/src/pages/ViewPost.jsx` -- confirmed `status`, `updatedAt`, `publishedAt` available from API response. `authorId` check already exists for showing "Edit" link.
- Existing codebase: `client/src/pages/EditPost.jsx` -- confirmed full edit flow with author check, delete option.
- Existing codebase: `client/src/components/Navbar.jsx` -- confirmed `isContributor` conditional rendering.
- Phase 10 Research (`.planning/phases/10-schema-query-safety/10-RESEARCH.md`) -- confirmed all 14 query sites filtered, cursor on `published_at`, draft visibility on single-post endpoint.

### Secondary (MEDIUM confidence)
- None needed. All findings derived from direct codebase inspection.

### Tertiary (LOW confidence)
- None. No external research required -- this phase is entirely about wiring existing infrastructure.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; all changes use existing Express/React/Turso stack
- Architecture: HIGH -- every modification point identified from direct code inspection with line numbers
- Pitfalls: HIGH -- all pitfalls derived from actual codebase patterns (route ordering, timestamp handling, redirect flow)

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable -- no external dependencies or fast-moving APIs)
