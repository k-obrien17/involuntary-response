# Phase 12: Likes - Research

**Researched:** 2026-03-01
**Domain:** Like/unlike toggle API, batch like-count loading, optimistic UI, Express + React + Turso
**Confidence:** HIGH

## Summary

Phase 12 adds the ability for logged-in readers (and contributors) to like/unlike posts, displays like counts on every post surface, and shows which posts the current user has already liked. The `post_likes` table already exists from Phase 10's migration 5 with a composite primary key `(post_id, user_id)` enforcing the one-like-per-user constraint at the database level. No schema migration is needed.

The implementation centers on three areas: (1) a toggle API endpoint on `server/routes/posts.js` that inserts or deletes from `post_likes`, (2) extending `batchLoadPostData` in `server/lib/post-helpers.js` to batch-load like counts (and optionally the current user's liked state) for all post-list endpoints, and (3) a frontend `LikeButton` component with optimistic state updates rendered in `PostCard`, `PostListItem`, and `ViewPost`. The existing `optionalAuth` middleware enables passing the current user's ID to batch queries without requiring authentication on public endpoints.

The Phase 10 research explicitly anticipated this: "batchLoadPostData unchanged for now (like/comment counts added in Phases 12-13)." All 5 route files that use `batchLoadPostData` will automatically gain like data once the shared helper is extended. The single-post endpoint (`GET /posts/:slug`) has its own inline queries and needs a separate like-count query.

**Primary recommendation:** Extend `batchLoadPostData` to accept an optional `userId` parameter for batch-loading like counts and liked-by-user state in a single pass, then add a toggle endpoint and a `LikeButton` component.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIKE-01 | Reader can like/unlike a post (toggle, one per reader per post) | Toggle API endpoint (`POST /posts/:slug/like`); `post_likes` composite PK enforces uniqueness; `authenticateToken` middleware gates the endpoint |
| LIKE-02 | Like count displays on posts in feed and permalink | `batchLoadPostData` extended with `likeCountMap`; `formatPosts` adds `likeCount` field; single-post endpoint adds inline like count query |
| LIKE-03 | Logged-in reader sees which posts they've already liked | `batchLoadPostData` extended with optional `userId` param for `likedByUserMap`; `formatPosts` adds `likedByUser` boolean; `optionalAuth` on list endpoints passes user context |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express 5 | (existing) | API routes for like toggle | Already in use; new route handler follows existing patterns |
| React 18 | (existing) | LikeButton component with optimistic state | Already in use; useState for toggle state |
| @libsql/client | (existing) | INSERT/DELETE on post_likes table | Already in use via db wrapper; composite PK handles idempotency |
| Tailwind CSS 3 | (existing) | Heart icon styling (filled vs outline) | Already in use for all components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-rate-limit | (existing) | Rate limit like/unlike endpoint | Already used on create/update/delete endpoints |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Toggle endpoint (single POST) | Separate POST (like) + DELETE (unlike) | Toggle is simpler for client (one call, server figures out state); REST purists prefer separate verbs but toggle matches UX intent |
| Inline SVG heart icon | Icon library (heroicons, lucide-react) | Inline SVG avoids adding a dependency for a single icon; the codebase has no icon library currently |
| Optimistic UI update | Wait for server response | Optimistic is standard for likes -- sub-100ms visual feedback; roll back on error |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure

```
server/
  lib/
    post-helpers.js       # MODIFIED: batchLoadPostData adds likeCountMap + likedByUserMap
  routes/
    posts.js              # MODIFIED: like toggle endpoint, optionalAuth on GET /
  middleware/
    auth.js               # NO CHANGE (optionalAuth + authenticateToken already exist)
client/src/
  components/
    LikeButton.jsx        # NEW: heart icon + count, toggle handler, optimistic state
    PostCard.jsx           # MODIFIED: renders LikeButton in metadata row
    PostListItem.jsx       # MODIFIED: renders like count (smaller format)
  pages/
    Home.jsx              # MODIFIED: pass onLikeToggle callback to PostCard
    ViewPost.jsx          # MODIFIED: renders LikeButton, handles toggle
```

### Pattern 1: Toggle Endpoint
**What:** A single `POST /posts/:slug/like` endpoint that checks whether the user has already liked the post, then inserts or deletes accordingly. Returns the new like count and liked state.
**When to use:** For binary toggle interactions (like/unlike, bookmark/unbookmark).
**Example:**
```javascript
// Source: derived from existing post_likes schema + codebase patterns
router.post('/:slug/like', authenticateToken, likeLimiter, async (req, res) => {
  const post = await db.get(
    'SELECT id FROM posts WHERE slug = ? AND status = ?',
    req.params.slug, 'published'
  );
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = await db.get(
    'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?',
    post.id, req.user.id
  );

  if (existing) {
    await db.run(
      'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
      post.id, req.user.id
    );
  } else {
    await db.run(
      'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
      post.id, req.user.id
    );
  }

  const { count } = await db.get(
    'SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?',
    post.id
  );

  res.json({ liked: !existing, likeCount: count });
});
```

### Pattern 2: Batch Like Count Loading in Shared Helper
**What:** Extend `batchLoadPostData` to accept an optional `userId` and batch-load like counts + user-liked state for all post IDs in one pass.
**When to use:** Every route that returns a list of posts.
**Example:**
```javascript
// Source: extending existing server/lib/post-helpers.js pattern
export async function batchLoadPostData(postIds, userId = null) {
  // ... existing embedMap, tagMap, artistMap loading ...

  // Like counts
  const likeCountMap = {};
  if (postIds.length > 0) {
    const likeCounts = await db.all(
      `SELECT post_id, COUNT(*) as count FROM post_likes
       WHERE post_id IN (${ph}) GROUP BY post_id`,
      ...postIds
    );
    for (const lc of likeCounts) {
      likeCountMap[lc.post_id] = lc.count;
    }
  }

  // User's liked posts (only if userId provided)
  const likedByUserMap = {};
  if (userId && postIds.length > 0) {
    const userLikes = await db.all(
      `SELECT post_id FROM post_likes
       WHERE post_id IN (${ph}) AND user_id = ?`,
      ...postIds, userId
    );
    for (const ul of userLikes) {
      likedByUserMap[ul.post_id] = true;
    }
  }

  return { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap };
}
```

### Pattern 3: Optimistic Like Toggle (Client)
**What:** Update the UI immediately on tap, then confirm with the server. Roll back on error.
**When to use:** Any binary toggle interaction where the server call is near-certain to succeed.
**Example:**
```jsx
// Source: standard React optimistic update pattern
function LikeButton({ postSlug, initialCount, initialLiked, onToggle }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const { user } = useAuth();

  const handleToggle = async () => {
    if (!user) return; // Or redirect to /join
    // Optimistic update
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
    try {
      const res = await posts.like(postSlug);
      setLiked(res.data.liked);
      setCount(res.data.likeCount);
    } catch {
      // Roll back
      setLiked(liked);
      setCount(count);
    }
  };

  return (
    <button onClick={handleToggle} className="...">
      {/* Heart SVG - filled when liked */}
      <span>{count > 0 ? count : ''}</span>
    </button>
  );
}
```

### Pattern 4: optionalAuth on List Endpoints
**What:** Add `optionalAuth` middleware to `GET /posts` (feed) and pass `req.user?.id` to `batchLoadPostData` so logged-in users see their liked state without requiring auth.
**When to use:** Any public endpoint that benefits from authenticated context.
**Example:**
```javascript
// Source: derived from existing server/routes/posts.js pattern
// BEFORE:
router.get('/', async (req, res) => { ... });
// AFTER:
router.get('/', optionalAuth, async (req, res) => {
  // ... existing query logic ...
  const { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap } =
    await batchLoadPostData(postIds, req.user?.id);
  const posts = formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap, likedByUserMap);
  // ...
});
```

### Anti-Patterns to Avoid
- **N+1 like queries:** Do NOT query like counts per-post inside a loop. Use the batch `COUNT(*) ... GROUP BY post_id` pattern in `batchLoadPostData`.
- **INSERT OR IGNORE for toggle:** Do NOT use `INSERT OR IGNORE` for the like action and a separate `DELETE` for unlike. The toggle endpoint should check-then-act: SELECT existing, then INSERT or DELETE. This returns the correct final state to the client.
- **Separate like count endpoint:** Do NOT create a separate `GET /posts/:slug/likes` endpoint. Include `likeCount` and `likedByUser` in the existing post response shape. Fewer round trips, simpler client code.
- **localStorage for liked state:** Do NOT cache liked state in localStorage. It gets stale. The server response is the source of truth, delivered with every post fetch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Like count aggregation | Per-post COUNT query in a loop | Batch `GROUP BY post_id` in `batchLoadPostData` | N+1 elimination; same pattern as existing embed/tag/artist loading |
| Heart icon | Third-party icon library | Inline SVG (12 lines) | No dependency for one icon; the codebase currently uses zero icon libraries |
| Duplicate like prevention | Application-level check only | Composite PK `(post_id, user_id)` in database | DB constraint is authoritative; application check is belt-and-suspenders |
| Rate limiting | Custom counter | `express-rate-limit` (already in use) | Proven, already configured on other endpoints |

**Key insight:** The hard part of likes is not the toggle -- it is efficiently loading like counts and user-liked state for lists of posts without N+1 queries. The `batchLoadPostData` helper already solved this pattern for embeds, tags, and artists. Extending it for likes follows the exact same approach.

## Common Pitfalls

### Pitfall 1: Forgetting optionalAuth on List Endpoints
**What goes wrong:** Logged-in users never see which posts they have liked in the feed because the list endpoint does not pass user identity to the batch loader.
**Why it happens:** The feed endpoint (`GET /posts`) currently has no auth middleware. It works fine without it. Adding `optionalAuth` is easy to forget because it is not required for like counts -- only for user-liked state.
**How to avoid:** Add `optionalAuth` to every list endpoint that renders posts where users might see their liked state: `GET /posts`, `GET /browse/tag/:tag`, `GET /browse/artist/:name`, `GET /browse/contributor/:username`, `GET /search`, `GET /users/:username/profile`.
**Warning signs:** `likedByUser` is always `false` even after liking a post and refreshing.

### Pitfall 2: Race Condition on Toggle
**What goes wrong:** Rapid double-tapping the like button sends two toggle requests, causing the final state to be the opposite of what the user expects.
**Why it happens:** The first request inserts a like. The second request finds the like and deletes it. The user meant to like once.
**How to avoid:** Debounce on the client side -- disable the button during the API call (set loading state), or use an `isToggling` ref to ignore clicks while a request is in-flight.
**Warning signs:** Like count flickering when tapping rapidly.

### Pitfall 3: Turso INSERT OR IGNORE Returning Unexpected rowsAffected
**What goes wrong:** Using `INSERT OR IGNORE` to handle duplicate likes returns `rowsAffected: 0` when the like already exists, making it ambiguous whether the operation succeeded or was a no-op.
**Why it happens:** STATE.md notes "Turso INSERT OR IGNORE behavior should be validated for likes (known issue #2713)."
**How to avoid:** Use the check-then-act pattern (SELECT existing, then INSERT or DELETE). This is explicit and returns the correct state. The composite PK is a safety net, not the primary control flow.
**Warning signs:** Like state desynchronizing between client and server.

### Pitfall 4: formatPosts Signature Breaking Existing Callers
**What goes wrong:** Extending `formatPosts` to accept `likeCountMap` and `likedByUserMap` as new parameters breaks callers that pass only the original 4 arguments.
**Why it happens:** JavaScript does not error on missing arguments -- they become `undefined`. But if `formatPosts` tries to index into `undefined`, it throws.
**How to avoid:** Use default parameters: `formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap = {}, likedByUserMap = {})`. This is backward-compatible. Existing callers that do not pass like maps will see `likeCount: 0` and `likedByUser: false`.
**Warning signs:** TypeError in routes that have not been updated to pass like maps.

### Pitfall 5: Like Count Not Updating After Toggle on Feed Page
**What goes wrong:** User likes a post from the feed, sees the heart fill, but the count in the card does not update because the parent component still holds the old posts array.
**Why it happens:** `PostCard` receives `post` as a prop. If the like count is stored in the posts array state on `Home.jsx`, the `LikeButton`'s optimistic update inside the component does not propagate back.
**How to avoid:** The `LikeButton` component manages its own `count` and `liked` state independently of the parent's post data. Initialize from `post.likeCount` and `post.likedByUser`, then manage locally. No need to lift state.
**Warning signs:** Like count showing stale values after toggle.

## Code Examples

### API Client Extension
```javascript
// Source: extending existing client/src/api/client.js pattern
export const posts = {
  list: (params) => api.get('/posts', { params }),
  create: (data) => api.post('/posts', data),
  getBySlug: (slug) => api.get(`/posts/${slug}`),
  update: (slug, data) => api.put(`/posts/${slug}`, data),
  delete: (slug) => api.delete(`/posts/${slug}`),
  like: (slug) => api.post(`/posts/${slug}/like`),  // NEW
};
```

### formatPosts Extension (Backward-Compatible)
```javascript
// Source: extending existing server/lib/post-helpers.js
export function formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap = {}, likedByUserMap = {}) {
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
    likeCount: likeCountMap[p.id] || 0,           // NEW
    likedByUser: !!likedByUserMap[p.id],           // NEW
  }));
}
```

### LikeButton Component (Inline SVG Heart)
```jsx
// Source: derived from Tailwind + standard React patterns
// Heart SVG paths:
// Outline: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//   d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
// Filled: <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
```

### Single-Post Like Data (ViewPost Endpoint)
```javascript
// Source: extending existing GET /posts/:slug in server/routes/posts.js
// After fetching the post, embed, tags, and artists:

const likeRow = await db.get(
  'SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?',
  post.id
);

let likedByUser = false;
if (req.user) {
  const userLike = await db.get(
    'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?',
    post.id, req.user.id
  );
  likedByUser = !!userLike;
}

// Include in response:
res.json({
  // ... existing fields ...
  likeCount: likeRow.count,
  likedByUser,
});
```

### Rate Limiter for Likes
```javascript
// Source: derived from existing rate limiters in server/routes/posts.js
const likeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 60,                     // 60 like/unlike actions per window
  message: { error: 'Too many like actions, try again later' },
});
```

## Endpoint Surface Audit

Every route that returns posts and needs like data.

### Routes Using batchLoadPostData (auto-gain likes when helper extended)

| # | File | Endpoint | Auth Change Needed |
|---|------|----------|--------------------|
| 1 | `posts.js` | `GET /` (feed) | Add `optionalAuth`, pass `req.user?.id` |
| 2 | `browse.js` | `GET /tag/:tag` | Add `optionalAuth`, pass `req.user?.id` |
| 3 | `browse.js` | `GET /artist/:name` | Add `optionalAuth`, pass `req.user?.id` |
| 4 | `browse.js` | `GET /contributor/:username` | Add `optionalAuth`, pass `req.user?.id` |
| 5 | `search.js` | `GET /` (search) | Add `optionalAuth`, pass `req.user?.id` |
| 6 | `profile.js` | `GET /:username/profile` | Add `optionalAuth`, pass `req.user?.id` |

### Routes with Inline Post Queries (need manual like loading)

| # | File | Endpoint | Change Needed |
|---|------|----------|---------------|
| 7 | `posts.js` | `GET /:slug` (single post) | Already has `optionalAuth`; add inline like count + likedByUser queries |

### Routes That Do NOT Need Like Data

| # | File | Endpoint | Reason |
|---|------|----------|--------|
| 8 | `feed.js` | `GET /` (RSS) | RSS does not display likes |
| 9 | `browse.js` | `GET /explore` | Returns tags/artists/contributors, not full posts |

### New Endpoint

| # | File | Endpoint | Method | Auth |
|---|------|----------|--------|------|
| 10 | `posts.js` | `/:slug/like` | POST | `authenticateToken` + `likeLimiter` |

## Frontend Component Audit

Every component/page that renders post data and needs like information.

| Component | Renders | Like Count? | Like Button? | Notes |
|-----------|---------|-------------|--------------|-------|
| `PostCard.jsx` | Full post in feed, search | Yes | Yes | Main feed view; heart icon in metadata row |
| `PostListItem.jsx` | Compact post in tag/artist/profile browse | Yes (count only) | No | Too compact for interactive button; show count as "N likes" text |
| `ViewPost.jsx` | Single post permalink | Yes | Yes | Prominent like button below post |
| `Home.jsx` | Feed page | Passes to PostCard | N/A | No direct changes needed |
| `Search.jsx` | Search results | Passes to PostCard | N/A | No direct changes needed |
| `TagBrowse.jsx` | Tag browse | Passes to PostListItem | N/A | No direct changes needed |
| `ArtistPage.jsx` | Artist browse | Passes to PostListItem | N/A | No direct changes needed |
| `Profile.jsx` | Profile page | Passes to PostListItem | N/A | No direct changes needed |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate like/unlike endpoints | Toggle endpoint (single POST) | Industry standard ~2020+ | Simpler client code, fewer API calls |
| Server-round-trip for visual feedback | Optimistic UI with rollback | Standard React pattern | Sub-100ms visual response |
| Per-post like count queries | Batch COUNT + GROUP BY | Established pattern | Eliminates N+1 for feed of 20+ posts |

## Open Questions

1. **Should PostListItem show a clickable like button or just a count?**
   - What we know: PostListItem is a compact list-style component (text preview + author + time). Adding a button changes its visual weight.
   - What's unclear: User expectation for like interaction in compact lists.
   - Recommendation: Show count only (e.g., "3 likes" text) in PostListItem. Reserve the interactive heart button for PostCard and ViewPost where there is more visual space. This can be revisited later.

2. **Should logged-out visitors see a like button that prompts them to join?**
   - What we know: The success criteria says "Like count is visible on every post in the feed and on the permalink page (even to logged-out visitors)." Count is always visible. Button behavior for logged-out users is not specified.
   - What's unclear: Whether showing a disabled heart or redirecting to /join on click is better UX.
   - Recommendation: Show the heart icon (outline) to everyone. On click when logged out, navigate to `/join`. This provides a gentle signup prompt.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `server/db/index.js` (migration 5, post_likes schema), `server/lib/post-helpers.js` (batchLoadPostData pattern), `server/routes/posts.js` (endpoint patterns), `server/middleware/auth.js` (optionalAuth, authenticateToken)
- Phase 10 research: `.planning/phases/10-schema-query-safety/10-RESEARCH.md` (confirmed batchLoadPostData extension plan for likes)
- STATE.md: Turso INSERT OR IGNORE concern noted; addressed via check-then-act pattern

### Secondary (MEDIUM confidence)
- Rate limiting pattern: Derived from existing `createLimiter`, `updateLimiter`, `deleteLimiter` in posts.js (60/15min matches Backyard Marquee's like rate limit)
- Optimistic UI pattern: Standard React pattern, no external source needed

### Tertiary (LOW confidence)
- None. All findings derived from direct codebase inspection and Phase 10 research.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; pure extension of existing Express/React/Turso patterns
- Architecture: HIGH -- all extension points identified from direct code inspection; batchLoadPostData pattern proven in Phase 10
- Pitfalls: HIGH -- derived from codebase structure (6 list endpoints needing optionalAuth, known Turso INSERT OR IGNORE concern from STATE.md, N+1 prevention pattern)

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable -- no external dependencies or fast-moving APIs)
