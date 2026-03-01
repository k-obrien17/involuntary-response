# Phase 13: Comments - Research

**Researched:** 2026-03-01
**Domain:** Flat comment system -- CRUD API, chronological display, role-based delete, Express + React + Turso
**Confidence:** HIGH

## Summary

Phase 13 adds flat, top-level comments on the post permalink page. Logged-in users (readers, contributors, admins) can post a comment; comment authors can delete their own; post authors and admins can delete any comment on a post; logged-out visitors can read but not write or delete. The `post_comments` table already exists from Phase 10 migration 5 with columns `(id, post_id, user_id, body, created_at)` and an index on `(post_id, created_at)`. No schema migration is needed.

The implementation naturally splits into two areas: (1) server-side -- comment CRUD endpoints on `routes/posts.js`, extending `batchLoadPostData` with `commentCountMap` for list views, and loading full comments on the single-post endpoint; (2) client-side -- a `CommentSection` component rendered on `ViewPost.jsx` that displays comments chronologically, provides a compose form for logged-in users, and shows delete buttons with appropriate permission checks. The existing `LikeButton` component provides the direct pattern: self-managed state, API client calls, optimistic/responsive UI, and auth-gated interactions.

The moderation model is straightforward: the comment's own `user_id` determines self-delete, the post's `author_id` grants the contributor delete power, and `role === 'admin'` grants global delete. All three checks happen server-side in a single delete endpoint. The JWT already contains `id` and `role`, and `optionalAuth` already passes user context to the single-post endpoint. The out-of-scope items (comment editing, threading, notifications) are explicitly documented in REQUIREMENTS.md.

**Primary recommendation:** Add comment CRUD endpoints to `routes/posts.js`, extend `batchLoadPostData` with `commentCountMap`, load full comment data in `GET /posts/:slug`, and build a `CommentSection` component for the permalink page.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CMNT-01 | Reader can post a top-level comment on a post | `POST /posts/:slug/comments` endpoint with `authenticateToken`; comment body sanitized (max 500 chars, HTML stripped); `post_comments` table already exists from Phase 10 |
| CMNT-02 | Comments display chronologically on the post permalink | `GET /posts/:slug` extended to return `comments` array ordered by `created_at ASC`; each comment includes `id`, `body`, `createdAt`, `author` (displayName, username, emailHash); `CommentSection` component renders list below post |
| CMNT-03 | Comment author can delete their own comment | `DELETE /posts/:slug/comments/:commentId` with `authenticateToken`; server checks `comment.user_id === req.user.id` |
| CMNT-04 | Post author and admin can delete any comment on the post | Same delete endpoint; server also checks `post.author_id === req.user.id` OR `req.user.role === 'admin'`; three-way OR for authorization |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express 5 | (existing) | Comment endpoints on posts router | All post-related routes live in `routes/posts.js` |
| React 18 | (existing) | CommentSection component with form + list | useState for comments array, form state |
| @libsql/client | (existing) | INSERT/SELECT/DELETE on post_comments | Same db wrapper; parameterized queries |
| Tailwind CSS 3 | (existing) | Comment styling (cards, form, delete buttons) | Consistent with all existing components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-rate-limit | (existing) | Rate limit comment creation | Prevent spam; same pattern as like/create limiters |
| Axios | (existing) | API client methods for comment CRUD | Existing `client/src/api/client.js` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Comments on posts router | Separate comments router | Posts router already handles likes; comments are post-scoped; keeps the routing consistent |
| Fetch full comments only on permalink | Include commentCount in feed via batchLoadPostData | Adding commentCount to batch helper now is cheap and prepares for FEED-01 (deferred); full comments only on permalink to avoid payload bloat |
| Server-validated delete permissions | Client-only hide/show of delete button | MUST validate server-side; client hint is cosmetic only |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
server/
  lib/
    post-helpers.js       # MODIFIED: batchLoadPostData adds commentCountMap; formatPosts adds commentCount
  routes/
    posts.js              # MODIFIED: POST /:slug/comments, DELETE /:slug/comments/:commentId, GET /:slug returns comments array
client/src/
  components/
    CommentSection.jsx    # NEW: comment list + compose form + delete handling
  pages/
    ViewPost.jsx          # MODIFIED: renders CommentSection, passes post data
  api/
    client.js             # MODIFIED: add comments API methods
```

### Pattern 1: Comment CRUD Endpoints
**What:** Two new endpoints nested under posts: `POST /:slug/comments` (create) and `DELETE /:slug/comments/:commentId` (delete). Both require `authenticateToken`. The create endpoint sanitizes body, validates length, inserts, and returns the new comment with author info. The delete endpoint checks three-way authorization (self, post author, admin).
**When to use:** For any post-scoped resource that needs create + delete (no update).
**Example:**
```javascript
// POST /:slug/comments -- Create comment
router.post('/:slug/comments', authenticateToken, commentLimiter, async (req, res) => {
  const post = await db.get(
    "SELECT id FROM posts WHERE slug = ? AND status = 'published'",
    req.params.slug
  );
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const body = sanitize(req.body.body, 500);
  if (!body) return res.status(400).json({ error: 'Comment body is required' });

  const result = await db.run(
    'INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)',
    post.id, req.user.id, body
  );

  const comment = await db.get(
    `SELECT c.id, c.body, c.created_at, u.display_name, u.username, u.email
     FROM post_comments c JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    result.lastInsertRowid
  );

  res.status(201).json({
    id: comment.id,
    body: comment.body,
    createdAt: comment.created_at,
    author: {
      displayName: comment.display_name,
      username: comment.username,
      emailHash: emailHash(comment.email),
    },
    canDelete: true, // Author always can delete their own
  });
});
```

### Pattern 2: Three-Way Authorization for Delete
**What:** Comment deletion is authorized if ANY of three conditions is true: (1) the requesting user is the comment's author, (2) the requesting user is the post's author, or (3) the requesting user is an admin. All checked server-side.
**When to use:** For moderation actions where multiple roles have overlapping permissions.
**Example:**
```javascript
// DELETE /:slug/comments/:commentId
router.delete('/:slug/comments/:commentId', authenticateToken, async (req, res) => {
  const post = await db.get('SELECT id, author_id FROM posts WHERE slug = ?', req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comment = await db.get(
    'SELECT id, user_id FROM post_comments WHERE id = ? AND post_id = ?',
    req.params.commentId, post.id
  );
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const isCommentAuthor = comment.user_id === req.user.id;
  const isPostAuthor = post.author_id === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized to delete this comment' });
  }

  await db.run('DELETE FROM post_comments WHERE id = ?', comment.id);
  res.json({ message: 'Comment deleted' });
});
```

### Pattern 3: batchLoadPostData Extension for Comment Counts
**What:** Add `commentCountMap` to the batch helper (same pattern as `likeCountMap`). This provides comment counts for all list views without loading full comment data.
**When to use:** Whenever post lists need aggregate comment data.
**Example:**
```javascript
// In batchLoadPostData, after likeCounts:
const commentCounts = await db.all(
  `SELECT post_id, COUNT(*) as count FROM post_comments WHERE post_id IN (${ph}) GROUP BY post_id`,
  ...postIds
);
for (const row of commentCounts) {
  commentCountMap[row.post_id] = row.count;
}
```

### Pattern 4: Full Comment Loading on Permalink
**What:** The single-post endpoint `GET /posts/:slug` loads all comments with author data in a single JOIN query, ordered by `created_at ASC` (chronological). Each comment gets a `canDelete` boolean based on the requesting user's permissions.
**When to use:** For the post detail/permalink view only (not list views).
**Example:**
```javascript
// In GET /:slug handler, after fetching like data:
const commentRows = await db.all(
  `SELECT c.id, c.body, c.created_at, c.user_id,
          u.display_name, u.username, u.email
   FROM post_comments c
   JOIN users u ON c.user_id = u.id
   WHERE c.post_id = ?
   ORDER BY c.created_at ASC`,
  post.id
);

const comments = commentRows.map((c) => ({
  id: c.id,
  body: c.body,
  createdAt: c.created_at,
  author: {
    displayName: c.display_name,
    username: c.username,
    emailHash: emailHash(c.email),
  },
  canDelete:
    (req.user && c.user_id === req.user.id) ||
    (req.user && post.author_id === req.user.id) ||
    (req.user && req.user.role === 'admin'),
}));
```

### Anti-Patterns to Avoid
- **N+1 comment author queries:** Do NOT load comments then loop to fetch authors. Use a single JOIN query.
- **Client-side authorization:** Do NOT rely solely on hiding the delete button client-side. Server MUST check permissions on the delete endpoint.
- **Loading full comments in list views:** Comments should only be fully loaded on the permalink. List views get `commentCount` from `batchLoadPostData`.
- **Exposing user emails in comment data:** Return `emailHash` (for Gravatar), never the raw email address.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitization | Custom regex | Existing `sanitize()` function in posts.js | Already strips HTML tags and enforces max length; proven pattern |
| Rate limiting | Custom counter | express-rate-limit (already installed) | Handles sliding windows, configurable per-endpoint |
| Avatar display | Custom image logic | Existing `Avatar` component + `emailHash()` | Gravatar-compatible, already used throughout the app |
| Relative timestamps | Custom date math | Existing `relativeTime()` from `utils/formatDate.js` | Already handles all time units; used by PostCard and PostListItem |

**Key insight:** This phase reuses almost everything already built. The only new file is `CommentSection.jsx`. All server patterns (sanitize, rate limit, auth middleware, batch loading, emailHash) are established.

## Common Pitfalls

### Pitfall 1: Missing Server-Side Authorization on Delete
**What goes wrong:** Only checking permissions client-side (showing/hiding the delete button) without server enforcement. Any user could call the DELETE endpoint directly.
**Why it happens:** Easy to forget server check when the UI already hides the button.
**How to avoid:** The delete endpoint MUST check three conditions: `isCommentAuthor || isPostAuthor || isAdmin`. Return 403 if none match.
**Warning signs:** Delete endpoint with no authorization check; relying on `requireContributor` middleware (wrong -- readers can also delete their own comments).

### Pitfall 2: Not Validating Comment Belongs to Post
**What goes wrong:** `DELETE /posts/:slug/comments/:commentId` that only checks the commentId without verifying it belongs to the post identified by `:slug`. Could allow deleting comments on other posts via crafted requests.
**Why it happens:** Skipping the `post_id` check in the WHERE clause.
**How to avoid:** Always query `WHERE id = ? AND post_id = ?` when fetching the comment for deletion.
**Warning signs:** Delete query with only `WHERE id = ?`.

### Pitfall 3: Using requireContributor on Comment Endpoints
**What goes wrong:** Comment creation and deletion incorrectly gated by `requireContributor`, which blocks readers. Readers are the primary commenters.
**Why it happens:** Cargo-culting from post creation/update endpoints which do require contributor access.
**How to avoid:** Use `authenticateToken` only (any logged-in user). The three-way check on delete handles authorization.
**Warning signs:** `requireContributor` appearing in comment route middleware chain.

### Pitfall 4: Forgetting canDelete in Comment Response
**What goes wrong:** Client has no way to know whether to show the delete button, leading to either always showing it (users see errors on unauthorized deletes) or never showing it.
**Why it happens:** Omitting the per-comment permission flag from the response.
**How to avoid:** Compute `canDelete` server-side for each comment based on `req.user` context. Include it in the response. Client renders delete button only when `canDelete === true`.
**Warning signs:** Comment response without `canDelete` field; client doing its own permission logic.

### Pitfall 5: Stale Comment Data After Delete
**What goes wrong:** User deletes a comment but the list still shows it until page refresh.
**Why it happens:** Not removing the comment from local state after successful API call.
**How to avoid:** Filter the deleted comment out of the local comments array on successful delete response. Optimistic removal (remove immediately, restore on error) matches the LikeButton pattern.
**Warning signs:** Comment visible after delete until refresh.

### Pitfall 6: BigInt Comparison in Authorization Check
**What goes wrong:** `comment.user_id === req.user.id` returns false because one is BigInt and the other is Number.
**Why it happens:** Turso's libsql driver returns integers as BigInt; JWT payload stores numbers.
**How to avoid:** The project already has the `coerceRow` helper in `db/index.js` that converts BigInt to Number. This covers all db.get/db.all results. No additional action needed, but worth verifying in tests.
**Warning signs:** Authorization check always fails despite matching IDs.

## Code Examples

Verified patterns from the existing codebase:

### Rate Limiter for Comments
```javascript
// Source: existing patterns in server/routes/posts.js
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 30,                     // 30 comments per window
  message: { error: 'Too many comments, try again later' },
});
```

### Sanitize Comment Body
```javascript
// Source: existing sanitize() in server/routes/posts.js
function sanitize(str, maxLength) {
  if (str == null) return null;
  return String(str).trim().replace(/<[^>]*>/g, '').slice(0, maxLength);
}

// Usage:
const body = sanitize(req.body.body, 500);
if (!body) return res.status(400).json({ error: 'Comment body is required' });
```

### API Client Methods
```javascript
// Source: pattern from client/src/api/client.js
export const posts = {
  // ... existing methods ...
  addComment: (slug, body) => api.post(`/posts/${slug}/comments`, { body }),
  deleteComment: (slug, commentId) => api.delete(`/posts/${slug}/comments/${commentId}`),
};
```

### CommentSection Component Structure
```jsx
// Source: follows LikeButton pattern (self-managed state, auth check, API calls)
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { posts } from '../api/client';
import Avatar from './Avatar';
import { relativeTime } from '../utils/formatDate';

export default function CommentSection({ postSlug, initialComments, postAuthorId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments || []);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await posts.addComment(postSlug, body.trim());
      setComments([...comments, res.data]);
      setBody('');
    } catch (err) {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await posts.deleteComment(postSlug, commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      // handle error
    }
  };

  return (
    <section>
      {/* Comment list */}
      {comments.map((comment) => (
        <div key={comment.id}>
          <Avatar emailHash={comment.author.emailHash} displayName={comment.author.displayName} size={24} />
          <span>{comment.author.displayName}</span>
          <span>{relativeTime(comment.createdAt)}</span>
          <p>{comment.body}</p>
          {comment.canDelete && (
            <button onClick={() => handleDelete(comment.id)}>Delete</button>
          )}
        </div>
      ))}
      {/* Compose form (logged-in only) */}
      {user && (
        <form onSubmit={handleSubmit}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} />
          <button type="submit" disabled={submitting || !body.trim()}>Post</button>
        </form>
      )}
    </section>
  );
}
```

### Extending formatPosts with commentCount
```javascript
// Source: existing formatPosts in server/lib/post-helpers.js
export function formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap = {}, likedByUserMap = {}, commentCountMap = {}) {
  return rows.map((p) => ({
    // ... existing fields ...
    commentCount: commentCountMap[p.id] || 0,
  }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate comments router file | Nested under posts router | Current project pattern | Keeps comment endpoints scoped to posts (`/:slug/comments`) |
| Thread/reply comment trees | Flat comments | Explicit project decision (REQUIREMENTS.md Out of Scope) | Simpler implementation; matches short-form post format |
| Comment editing | Delete and re-post | Explicit project decision (REQUIREMENTS.md Out of Scope) | No UPDATE endpoint needed; reduces surface area |

**Explicitly out of scope (per REQUIREMENTS.md):**
- Comment editing -- "Delete and re-post; comments are ephemeral reactions"
- Comment threading/replies -- "Flat comments match the short-form post format"
- Email notifications -- "Contributor pool is small enough to check dashboard"

## Open Questions

1. **Comment max length**
   - What we know: Post body max is 1200 chars. Comments are "short reactions."
   - What's unclear: No explicit max in requirements.
   - Recommendation: Use 500 characters. Short enough for reactions, long enough for a thought. The sanitize function already handles truncation.

2. **Comment count in feed cards**
   - What we know: FEED-01 ("Comment count displays alongside like count in feed cards") is listed under "Future Requirements" -- deferred.
   - What's unclear: Whether to add commentCount to formatPosts now or later.
   - Recommendation: Add `commentCountMap` to `batchLoadPostData` and `commentCount` to `formatPosts` now. The query cost is minimal (one GROUP BY query already batched), and it avoids touching all 6 route call sites again later. Feed card UI rendering of the count can remain deferred per FEED-01.

3. **Optimistic delete vs wait-for-server**
   - What we know: LikeButton uses optimistic updates (toggle immediately, roll back on error).
   - What's unclear: Whether delete should be optimistic.
   - Recommendation: Use optimistic delete (remove from local array immediately, restore on error). Deletion is a destructive action but the UX feedback should be instant. The LikeButton precedent supports this.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `server/db/index.js` migration 5 -- post_comments schema verified
- Codebase inspection: `server/lib/post-helpers.js` -- batchLoadPostData pattern verified
- Codebase inspection: `server/routes/posts.js` -- like toggle pattern, sanitize, rate limiters
- Codebase inspection: `server/middleware/auth.js` -- authenticateToken, optionalAuth, requireContributor
- Codebase inspection: `client/src/components/LikeButton.jsx` -- self-managed state pattern
- Codebase inspection: `client/src/pages/ViewPost.jsx` -- permalink page structure
- Codebase inspection: `client/src/context/AuthContext.jsx` -- user.role, isAdmin, isContributor

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` -- CMNT-01 through CMNT-04, out-of-scope decisions
- `.planning/ROADMAP.md` -- Phase 13 success criteria
- `.planning/STATE.md` -- accumulated decisions from Phases 10-12

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries; reuses all existing patterns
- Architecture: HIGH - Direct extension of Phase 12 patterns (like -> comment); all integration points verified in codebase
- Pitfalls: HIGH - Based on established codebase patterns; BigInt issue already solved globally; auth middleware well-understood
- Comment max length: MEDIUM - 500 chars is a recommendation, not a verified requirement

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable; no external dependencies, all patterns internal)
