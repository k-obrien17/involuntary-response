# Phase 3: Feed and Post Display - Research

**Researched:** 2026-02-27
**Domain:** Public feed rendering, post permalink pages, text-first responsive design, embed facade pattern
**Confidence:** HIGH

## Summary

Phase 3 transforms the application from a contributor-facing authoring tool into a public reading experience. The work spans three domains: (1) a server-side feed API endpoint that returns paginated posts in reverse-chronological order with their embeds, tags, and author info in a single query, (2) a client-side feed page and post permalink page that render this data with click-to-load embed placeholders instead of eager iframe loading, and (3) a text-first responsive design system built on Tailwind CSS utilities with the `@tailwindcss/typography` plugin for consistent, readable typography.

The existing codebase already has a `GET /api/posts/:slug` endpoint that returns a single post with its embed, tags, and author -- but there is no list endpoint. The feed requires a new `GET /api/posts` endpoint with cursor-based pagination (using the composite `(created_at, id)` as cursor) to efficiently serve paginated results without the offset-skip performance degradation. The `idx_posts_created_at` index created in Phase 2's migration already supports `ORDER BY created_at DESC` queries.

The most important design decision is the embed facade pattern. Success criterion #1 explicitly states "embedded music players rendered as click-to-load placeholders." This means in the feed, embeds render as lightweight static placeholders (showing provider icon, track/album title if available, and a play button) that only load the heavy iframe when the reader clicks. This is the standard performance pattern for third-party embeds per Google's Web Vitals guidance. A feed of 20 posts with eager iframe loading would fetch ~20 external resources per page; facades reduce this to zero until interaction. The existing `EmbedPreview` component (which renders the iframe directly) will be kept for the single-post permalink page, and a new `EmbedPlaceholder` component will serve the feed.

**Primary recommendation:** Build one new API endpoint (`GET /api/posts`), refactor Home.jsx into a feed page, build a proper ViewPost page, and establish the text-first design system with `@tailwindcss/typography` -- all using the existing stack with one new dev dependency.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | Visitor can view a reverse-chronological feed of all posts | New `GET /api/posts` endpoint with cursor-based pagination, `idx_posts_created_at` index already exists, feed page replaces current Home.jsx centered splash |
| SHAR-01 | Each post has a clean permalink URL | Route `/posts/:slug` already wired in App.jsx, `GET /api/posts/:slug` endpoint exists from Phase 2 -- ViewPost.jsx needs redesign to match text-first layout |
| DSGN-01 | Minimal text-first layout with large type, whitespace, and single content column | `@tailwindcss/typography` plugin with `prose prose-lg lg:prose-xl` classes, max-w-2xl single column, system font stack already configured |
| DSGN-02 | Fully responsive and mobile-friendly | Tailwind's mobile-first responsive utilities, single-column layout that scales naturally, responsive typography via prose size modifiers at breakpoints |
</phase_requirements>

## Standard Stack

### Core (Already Installed)

No new runtime dependencies needed. Everything required is already in the project.

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | 18.3.1 | Frontend UI | Installed (client) |
| React Router | 6.28.0 | Client routing (`/posts/:slug` already wired) | Installed (client) |
| Tailwind CSS | 3.4.14 | Utility-first styling | Installed (client) |
| Axios | 1.7.7 | API calls with auth interceptor | Installed (client) |
| Express | 5.1.0 | API server | Installed (server) |
| @libsql/client | 0.14.0 | Turso database driver | Installed (server) |

### New Dev Dependency

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tailwindcss/typography | 0.5.x | Prose classes for readable body text with consistent vertical rhythm | Official Tailwind Labs plugin, 7M+ weekly npm downloads, designed exactly for blog/article typography. Compatible with Tailwind CSS 3.4. Required for DSGN-01 |

### Native Browser APIs (No Library Needed)

| API | Purpose | Browser Support |
|-----|---------|----------------|
| `Intl.RelativeTimeFormat` | "3 hours ago" relative timestamps in the feed | All modern browsers + Node.js, no polyfill needed |
| `IntersectionObserver` | Detect when embed placeholders are near viewport (optional progressive enhancement) | All modern browsers |

### Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@tailwindcss/typography` prose classes | Hand-written Tailwind utility classes for every text element | Typography plugin handles vertical rhythm (margins between paragraphs, headings, lists), font sizing, and line-height consistently. Hand-rolling this across feed cards and post pages duplicates effort and risks inconsistency |
| Cursor-based pagination (`(created_at, id)`) | Offset-based pagination (`LIMIT 20 OFFSET 40`) | Offset pagination degrades with depth (DB scans and skips N rows). Cursor pagination always performs O(page_size) with the existing index. Also avoids duplicate/missing posts when new content is inserted |
| Custom `EmbedPlaceholder` component | Spotify iFrame API (`loadUri`) for programmatic loading | The Spotify iFrame API is designed for podcasts and requires loading an external script (`embed/iframe-api/v1`). For simple click-to-load, a static placeholder that swaps to an `<iframe>` on click is lighter and works for all providers (Spotify, Apple Music, etc.) with no external dependencies |
| `Intl.RelativeTimeFormat` for relative dates | `date-fns`, `dayjs`, `moment` | Native browser API handles "3 hours ago" / "2 days ago" formatting without adding a dependency. Supported in all target browsers |
| No infinite scroll for v1 | `react-intersection-observer` + infinite scroll | The site has few contributors posting short-form content. A "Load more" button with cursor pagination is simpler, works without JavaScript quirks (scroll position, back-button issues), and matches the text-first editorial aesthetic |

### Installation

```bash
cd client && npm install -D @tailwindcss/typography
```

Then add to `tailwind.config.js`:
```javascript
export default {
  // ...existing config
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

## Architecture Patterns

### Recommended Project Structure (New/Modified Files)

```
client/src/
├── pages/
│   ├── Home.jsx              # REWRITE: Feed page (reverse-chronological post list)
│   └── ViewPost.jsx          # REWRITE: Proper post permalink with text-first design
├── components/
│   ├── PostCard.jsx           # NEW: Single post in feed (body, author, date, tags, embed placeholder)
│   ├── EmbedPlaceholder.jsx   # NEW: Click-to-load facade for embeds in feed
│   ├── EmbedPreview.jsx       # EXISTING: Full iframe embed (used on ViewPost page)
│   └── Navbar.jsx             # MINOR: Possible layout alignment adjustments
└── utils/
    └── formatDate.js          # NEW: Relative time formatter using Intl.RelativeTimeFormat

server/
├── routes/
│   └── posts.js               # ADD: GET / (list) endpoint with cursor pagination
└── (no other changes)
```

### Pattern 1: Cursor-Based Feed Pagination

**What:** The feed API returns posts in reverse chronological order with cursor-based pagination. The cursor is a composite of `(created_at, id)` to guarantee stable ordering even when posts share the same timestamp.

**When to use:** Always for the feed endpoint. Never use OFFSET pagination.

**Example:**
```javascript
// server/routes/posts.js -- GET /api/posts
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const cursor = req.query.cursor; // "2026-02-27T10:00:00|42"

    let posts;
    if (cursor) {
      const [cursorDate, cursorId] = cursor.split('|');
      posts = await db.all(
        `SELECT p.id, p.slug, p.body, p.author_id, p.created_at, p.updated_at,
                u.display_name as author_display_name, u.username as author_username
         FROM posts p
         JOIN users u ON p.author_id = u.id
         WHERE (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT ?`,
        cursorDate, cursorDate, parseInt(cursorId), limit + 1
      );
    } else {
      posts = await db.all(
        `SELECT p.id, p.slug, p.body, p.author_id, p.created_at, p.updated_at,
                u.display_name as author_display_name, u.username as author_username
         FROM posts p
         JOIN users u ON p.author_id = u.id
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT ?`,
        limit + 1
      );
    }

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    // Batch-fetch embeds and tags for all posts
    const postIds = posts.map(p => p.id);
    // ... (see Pattern 2)

    const lastPost = posts[posts.length - 1];
    const nextCursor = hasMore && lastPost
      ? `${lastPost.created_at}|${lastPost.id}`
      : null;

    res.json({ posts: formatted, nextCursor });
  } catch (err) {
    console.error('List posts error:', err);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});
```
Source: [Cursor-based pagination guide](https://bun.uptrace.dev/guide/cursor-pagination.html), [SQLite forum](https://sqlite.org/forum/info/e10528690699ee23)

### Pattern 2: Batch-Loading Related Data (Embeds + Tags)

**What:** Instead of N+1 queries (one per post for embeds, one per post for tags), load all embeds and tags for the current page of posts in two bulk queries, then merge in application code.

**When to use:** Always when loading a list of posts. The single-post endpoint (GET /:slug) already loads embed/tags per-post, which is fine for a single query.

**Example:**
```javascript
// After fetching the page of posts:
const postIds = posts.map(p => p.id);
if (postIds.length === 0) return res.json({ posts: [], nextCursor: null });

// SQLite doesn't have array binding -- build a parameterized IN clause
const placeholders = postIds.map(() => '?').join(',');

const embeds = await db.all(
  `SELECT post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html
   FROM post_embeds WHERE post_id IN (${placeholders})`,
  ...postIds
);

const tags = await db.all(
  `SELECT post_id, tag FROM post_tags WHERE post_id IN (${placeholders}) ORDER BY tag`,
  ...postIds
);

// Index by post_id for O(1) lookup
const embedMap = Object.fromEntries(embeds.map(e => [e.post_id, e]));
const tagMap = {};
for (const t of tags) {
  (tagMap[t.post_id] ||= []).push(t.tag);
}
```

### Pattern 3: Embed Facade (Click-to-Load Placeholder)

**What:** In the feed, embeds render as a lightweight static placeholder showing the provider name/icon, track title (if available), and a play button. Clicking the placeholder replaces it with the actual iframe. This is the "facade pattern" recommended by Google's Lighthouse team for third-party embeds.

**When to use:** Always in the feed (PostCard component). The full ViewPost page renders the iframe directly (using the existing EmbedPreview component) because there is only one embed per page.

**Example:**
```jsx
// client/src/components/EmbedPlaceholder.jsx
import { useState } from 'react';
import EmbedPreview from './EmbedPreview';

export default function EmbedPlaceholder({ embed }) {
  const [loaded, setLoaded] = useState(false);

  if (!embed) return null;

  if (loaded) {
    return <EmbedPreview embed={embed} />;
  }

  const providerLabel = embed.provider === 'spotify' ? 'Spotify' : 'Apple Music';
  const title = embed.title || `Listen on ${providerLabel}`;

  return (
    <button
      onClick={() => setLoaded(true)}
      className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200
                 bg-gray-50 hover:bg-gray-100 transition text-left group"
      aria-label={`Load ${providerLabel} player: ${title}`}
    >
      {/* Provider icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200
                      flex items-center justify-center text-gray-500 group-hover:text-gray-700">
        {/* Play triangle SVG */}
        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4 2l10 6-10 6V2z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500">{providerLabel}</p>
      </div>
    </button>
  );
}
```
Source: [Google web.dev embed best practices](https://web.dev/articles/embed-best-practices), [Chrome Lighthouse third-party facades](https://developer.chrome.com/docs/lighthouse/performance/third-party-facades)

### Pattern 4: Text-First Typography System

**What:** Use the `@tailwindcss/typography` plugin's `prose` classes as the foundation for readable, generous post body text. Override specific values via Tailwind utilities when the prose defaults don't match the desired aesthetic.

**When to use:** Post body text in both the feed (PostCard) and the permalink page (ViewPost). NOT for UI chrome (navbar, buttons, metadata).

**Example:**
```jsx
// Post body in feed card
<div className="prose prose-lg lg:prose-xl prose-gray max-w-none">
  <p className="whitespace-pre-wrap">{post.body}</p>
</div>

// Full post page -- even larger
<article className="prose prose-lg md:prose-xl lg:prose-2xl prose-gray max-w-none">
  <p className="whitespace-pre-wrap leading-relaxed">{post.body}</p>
</article>
```

Key typography values for the text-first aesthetic:
- Feed card body: `prose-lg` (18px base, ~28px line-height)
- Post page body: `prose-xl` scaling to `prose-2xl` (20-24px base, 32-36px line-height)
- Max content width: `max-w-2xl` (672px) -- the reading-optimal width for long-line prose
- Vertical spacing between posts: `space-y-12` or `space-y-16` for generous breathing room

### Pattern 5: Relative Time Formatting

**What:** Use the native `Intl.RelativeTimeFormat` API to format post timestamps as "3 hours ago", "2 days ago", etc. No library needed.

**Example:**
```javascript
// client/src/utils/formatDate.js
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS = [
  { unit: 'year', ms: 365.25 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30.44 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

export function relativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date - now;

  for (const { unit, ms } of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return 'just now';
}

// For the post permalink page, show full date
export function fullDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```
Source: [MDN Intl.RelativeTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat)

### Anti-Patterns to Avoid

- **Eager iframe loading in feed:** Never render `<iframe>` elements directly in the feed list. Each Spotify/Apple Music embed loads ~1-3MB of external resources. A page of 20 posts with eager iframes would make 20+ network requests to third-party domains, destroying page load performance and Core Web Vitals. Use the facade/placeholder pattern.
- **N+1 query pattern:** Do not fetch embeds and tags per-post in a loop. Use batch `IN (...)` queries as shown in Pattern 2. With 20 posts per page, this is the difference between 41 queries (1 list + 20 embeds + 20 tags) and 3 queries (1 list + 1 embeds batch + 1 tags batch).
- **OFFSET pagination:** Do not use `LIMIT 20 OFFSET 40`. As the user scrolls deeper, the database must scan and skip all offset rows before returning the page. With cursor pagination, every page load performs identically regardless of depth.
- **Prose plugin without max-w-none:** The `prose` class sets `max-width: 65ch` by default, which conflicts with the component's own container width. Always pair with `max-w-none` when the parent container already controls width.
- **Truncating post body in feed:** The posts are ~500-800 characters (one paragraph). They should render in full in the feed. Truncation would undermine the "visceral, honest reaction" reading experience. Show the full body in every feed card.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blog/article typography (vertical rhythm, font sizing, line height) | Custom Tailwind utility classes for every text element | `@tailwindcss/typography` prose classes | The plugin handles dozens of subtle typographic decisions (paragraph margins, heading sizes, code blocks, link styles) that take hours to get right manually. DSGN-01 requires "large type, generous whitespace" which maps directly to `prose-lg`/`prose-xl` |
| Relative time display ("3 hours ago") | Custom date math or `date-fns` / `dayjs` | `Intl.RelativeTimeFormat` | Built into all modern browsers, zero bundle cost, handles pluralization and localization correctly |
| Cursor-based pagination logic | Custom cursor encoding/decoding | Simple `created_at|id` string format | Composite cursor (timestamp + ID) is the standard pattern for keyset pagination. The pipe separator is trivial to split. No need for Base64 encoding or opaque cursor libraries |
| Click-to-load embed facades | Complex lazy-loading libraries (`lazysizes`, `react-intersection-observer`) | Simple boolean state toggle in `EmbedPlaceholder` component | The feed shows 20 posts max per page. A `useState(false)` toggle that swaps placeholder for iframe on click is ~20 lines of code. No need for IntersectionObserver or scroll-based lazy loading |

**Key insight:** Phase 3 introduces zero new runtime dependencies. The typography plugin is a dev dependency (build-time only). Every other need is met by existing libraries, native browser APIs, or simple component patterns.

## Common Pitfalls

### Pitfall 1: SQLite Timestamp Comparison Gotcha

**What goes wrong:** SQLite stores DATETIME as text strings. Cursor-based pagination compares `created_at < ?` as string comparison. If timestamps have inconsistent formats (some with fractional seconds, some without), the string comparison produces wrong ordering.
**Why it happens:** Turso/SQLite's `CURRENT_TIMESTAMP` produces `YYYY-MM-DD HH:MM:SS` without fractional seconds. But if timestamps are inserted from JavaScript `new Date().toISOString()`, they include `T` separators and `.000Z` suffixes, creating format inconsistency.
**How to avoid:** Always use `DEFAULT CURRENT_TIMESTAMP` in the schema (already done) and never insert timestamps from JavaScript. The cursor comparison uses the exact string format from the database, so as long as all timestamps come from SQLite's `CURRENT_TIMESTAMP`, string comparison is correct.
**Warning signs:** Posts appearing out of order in the feed, or cursor pagination skipping/duplicating posts.

### Pitfall 2: Feed Query Missing JOIN Produces Broken Author Info

**What goes wrong:** The feed query forgets the `JOIN users` and returns `null` for author display name and username. The UI renders "By Unknown" or crashes on `.author.username`.
**Why it happens:** Copy-pasting the basic `SELECT * FROM posts` pattern and forgetting that author info lives in the `users` table.
**How to avoid:** The feed query MUST join users: `FROM posts p JOIN users u ON p.author_id = u.id`. Test with the actual data shape, not mocks.
**Warning signs:** "Unknown" or "null" appearing where author names should be.

### Pitfall 3: Empty Feed State Forgotten

**What goes wrong:** When there are zero posts (new deployment, or all posts deleted), the feed page shows a blank white page or a loading spinner that never resolves.
**Why it happens:** Developers test with seeded data and never encounter the empty state.
**How to avoid:** Handle the `posts.length === 0` case explicitly with a meaningful message (e.g., "Nothing here yet." or the site tagline). Test the empty state during development.
**Warning signs:** Blank page on first deploy before any posts exist.

### Pitfall 4: Embed Placeholder Layout Shift on Load

**What goes wrong:** When a user clicks the embed placeholder, the iframe loads with a different height than the placeholder. This causes the page content below to shift (CLS -- Cumulative Layout Shift).
**Why it happens:** The placeholder is a compact button (~60px tall) but the Spotify iframe is 152px (track) or 352px (album). Apple Music is 175px (song) or 450px (album).
**How to avoid:** Reserve the full iframe height in the placeholder using a `min-height` that matches the expected iframe dimensions. The embed data includes `embed_type` which maps to known heights: Spotify track=152, album=352; Apple song=175, album=450.
**Warning signs:** Content jumping when embed loads.

### Pitfall 5: Mobile Viewport Overflow from Iframes

**What goes wrong:** Spotify and Apple Music iframes have fixed widths or `max-width` that can overflow on small mobile screens (< 375px), causing horizontal scroll.
**Why it happens:** The iframe `width="100%"` works in most cases, but some Spotify embeds have internal minimum widths around 300px.
**How to avoid:** Wrap the iframe in a container with `overflow-hidden rounded-lg` to clip any overflow. The container takes `width: 100%` from the parent. Already partially handled in the existing `EmbedPreview` component.
**Warning signs:** Horizontal scrollbar on mobile devices.

### Pitfall 6: Tailwind Typography prose Overriding Component Styles

**What goes wrong:** The `prose` class applies styles to ALL descendant elements (links, paragraphs, headings). If embed placeholders, tag badges, or author metadata are inside a `prose` container, they inherit unwanted typography styles (margins, font sizes, link colors).
**Why it happens:** `prose` is designed for uncontrolled HTML (markdown output, CMS content). When used around a mix of content and UI components, it styles everything.
**How to avoid:** Apply `prose` only to the post body text element, not to the entire card. Use `not-prose` class on any child elements that should not inherit prose styles. Keep the embed placeholder, tags, and metadata outside the prose container.
**Warning signs:** Tags suddenly have different font size or margin; embed placeholder text inherits prose paragraph styles.

## Code Examples

### Feed API Endpoint (Complete)

```javascript
// server/routes/posts.js -- add to existing router

// GET / -- List posts (reverse chronological, cursor-paginated)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const cursor = req.query.cursor;

    let rows;
    if (cursor) {
      const [cursorDate, cursorId] = cursor.split('|');
      rows = await db.all(
        `SELECT p.id, p.slug, p.body, p.author_id, p.created_at, p.updated_at,
                u.display_name AS author_display_name, u.username AS author_username
         FROM posts p
         JOIN users u ON p.author_id = u.id
         WHERE (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT ?`,
        cursorDate, cursorDate, parseInt(cursorId), limit + 1
      );
    } else {
      rows = await db.all(
        `SELECT p.id, p.slug, p.body, p.author_id, p.created_at, p.updated_at,
                u.display_name AS author_display_name, u.username AS author_username
         FROM posts p
         JOIN users u ON p.author_id = u.id
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT ?`,
        limit + 1
      );
    }

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    // Batch-fetch embeds and tags
    const postIds = rows.map((p) => p.id);
    let embedMap = {};
    let tagMap = {};

    if (postIds.length > 0) {
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
    }

    const posts = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      body: p.body,
      authorId: p.author_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      author: {
        displayName: p.author_display_name,
        username: p.author_username,
      },
      embed: embedMap[p.id] || null,
      tags: tagMap[p.id] || [],
    }));

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.created_at}|${lastPost.id}` : null;

    res.json({ posts, nextCursor });
  } catch (err) {
    console.error('List posts error:', err);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});
```

### Feed Page Component

```jsx
// client/src/pages/Home.jsx (rewritten)
import { useState, useEffect } from 'react';
import { posts as postsApi } from '../api/client';
import PostCard from '../components/PostCard';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await postsApi.list();
        setPosts(res.data.posts);
        setNextCursor(res.data.nextCursor);
      } catch (err) {
        console.error('Failed to load feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await postsApi.list({ cursor: nextCursor });
      setPosts((prev) => [...prev, ...res.data.posts]);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-400 text-center">Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {posts.length === 0 ? (
        <p className="text-gray-400 text-center text-lg">Nothing here yet.</p>
      ) : (
        <div className="space-y-16">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="mt-16 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-gray-500 hover:text-gray-900 text-sm transition"
          >
            {loadingMore ? 'Loading...' : 'Older posts'}
          </button>
        </div>
      )}
    </main>
  );
}
```

### Post Card Component

```jsx
// client/src/components/PostCard.jsx
import { Link } from 'react-router-dom';
import EmbedPlaceholder from './EmbedPlaceholder';
import { relativeTime } from '../utils/formatDate';

export default function PostCard({ post }) {
  return (
    <article>
      {/* Post body -- text-first, large type */}
      <div className="prose prose-lg lg:prose-xl prose-gray max-w-none">
        <p className="whitespace-pre-wrap">{post.body}</p>
      </div>

      {/* Embed placeholder (click to load) */}
      {post.embed && (
        <div className="mt-6">
          <EmbedPlaceholder embed={post.embed} />
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-sm text-gray-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Metadata line */}
      <div className="mt-4 text-sm text-gray-400">
        <Link
          to={`/posts/${post.slug}`}
          className="hover:text-gray-600 transition"
        >
          {relativeTime(post.createdAt)}
        </Link>
        <span className="mx-2">&middot;</span>
        <span>{post.author.displayName}</span>
      </div>
    </article>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OFFSET pagination for feeds | Cursor-based (keyset) pagination | Standard since ~2020, widely adopted | Constant-time page loads regardless of depth |
| Eager iframe loading for embeds | Facade/click-to-load pattern | Google Web Vitals push (2021+) | Eliminates 1-3MB per embed from initial load |
| `moment.js` or `date-fns` for relative dates | `Intl.RelativeTimeFormat` (native) | Browser support complete since 2020 | Zero bundle cost |
| Custom typography CSS for blog layouts | `@tailwindcss/typography` prose plugin | Tailwind Typography v0.5.x (stable since 2022) | Consistent vertical rhythm with one class |

**Deprecated/outdated:**
- `moment.js`: Officially in maintenance mode since 2020. Use native Intl or `dayjs` if native is insufficient.
- OFFSET-based pagination for user-facing feeds: Performs worse at depth and causes duplicate/missing items. Cursor is the standard for reverse-chronological feeds.
- Eager iframe embedding in lists: Flagged by Lighthouse as a performance anti-pattern since 2021.

## Open Questions

1. **Should the feed show author avatar/profile image?**
   - What we know: PROF-04 (avatar upload) is a v2 requirement, not v1. The current user schema has no avatar field.
   - What's unclear: Whether a default avatar placeholder (initials or generic icon) adds visual value.
   - Recommendation: No avatar in v1. The text-first aesthetic is best served by clean text metadata (display name, relative timestamp). Adding placeholder avatars would introduce visual noise that competes with the writing.

2. **Should the "Load more" button auto-trigger near the bottom (infinite scroll)?**
   - What we know: The site targets a small number of invite-only contributors, so the total post volume is low. Infinite scroll is a v2 consideration at most.
   - What's unclear: Whether "Load more" will feel too clunky once there are 100+ posts.
   - Recommendation: Manual "Load more" button for v1. This is simpler, avoids scroll position bugs (especially with back-button navigation), and matches the deliberate, editorial pace of the site. Can upgrade to IntersectionObserver-triggered loading in Phase 4+ if needed.

3. **What page size for the feed?**
   - What we know: Posts are short (~500-800 chars). Twenty posts fit comfortably on-screen without feeling endless. The API enforces max 50 per request.
   - Recommendation: Default 20 per page. This balances initial load speed with sufficient content to read before hitting "Load more."

## Sources

### Primary (HIGH confidence)
- [Google web.dev: Best practices for third-party embeds](https://web.dev/articles/embed-best-practices) -- facade pattern, click-to-load interaction model
- [Chrome Lighthouse: Third-party facades](https://developer.chrome.com/docs/lighthouse/performance/third-party-facades) -- implementation guidance for embed placeholders
- [Spotify Embeds Documentation](https://developer.spotify.com/documentation/embeds) -- iframe attributes, oEmbed API, iframe API
- [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api) -- programmatic embed creation (considered and rejected in favor of simpler facade)
- [MDN: Intl.RelativeTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat) -- native relative time API
- [@tailwindcss/typography GitHub](https://github.com/tailwindlabs/tailwindcss-typography) -- plugin installation, prose classes, size modifiers, v3 compatibility
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) -- mobile-first breakpoint system
- Existing codebase: `server/routes/posts.js` (GET /:slug), `server/db/index.js` (schema + indexes), `client/src/components/EmbedPreview.jsx`, `client/src/pages/ViewPost.jsx`, `client/src/api/client.js`

### Secondary (MEDIUM confidence)
- [Cursor pagination guide (uptrace)](https://bun.uptrace.dev/guide/cursor-pagination.html) -- composite cursor pattern with timestamp + ID
- [SQLite cursor pagination pattern](https://gist.github.com/ssokolow/262503) -- keyset pagination without OFFSET
- [Builder.io: Relative time strings in JS](https://www.builder.io/blog/relative-time) -- Intl.RelativeTimeFormat utility function pattern
- [@tailwindcss/typography npm](https://www.npmjs.com/package/@tailwindcss/typography) -- version 0.5.x, compatibility confirmed with Tailwind 3.4

### Tertiary (LOW confidence)
- None -- all findings verified through primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new runtime dependencies, one dev dependency (`@tailwindcss/typography`) verified compatible with Tailwind 3.4
- Architecture: HIGH -- patterns follow existing codebase conventions (Express routes, Turso queries, React components), cursor pagination is well-documented
- Pitfalls: HIGH -- embed facade pattern verified via Google web.dev official documentation, SQLite timestamp behavior verified against existing schema
- Design system: HIGH -- `@tailwindcss/typography` prose classes are the standard approach for text-heavy layouts in Tailwind projects

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain -- no fast-moving dependencies)
