# Phase 2: Post Creation and Embeds - Research

**Researched:** 2026-02-27
**Domain:** Post CRUD with music embed integration (Spotify + Apple Music iframes)
**Confidence:** HIGH

## Summary

Phase 2 adds the core content creation pipeline to a working Express/React/Turso application that already has invite-only auth, admin management, and contributor sessions (Phase 1). The technical domain covers four areas: (1) database schema for posts, embeds, and tags, (2) server-side post CRUD with input sanitization and embed URL validation, (3) client-side post creation UI with auto-growing textarea, character counter, and embed URL preview, and (4) Spotify and Apple Music iframe embed rendering from pasted URLs.

The embed integration is the most important technical decision in this phase. Both Spotify and Apple Music support simple iframe embeds that require **no API keys or authentication**. Spotify's oEmbed API (`GET https://open.spotify.com/oembed?url={url}`) returns metadata (title, thumbnail) for free. Apple Music embeds use a predictable URL format (`embed.music.apple.com/{region}/{type}/{id}`). The contributor pastes a URL, the client parses it for instant preview, the server re-validates and fetches metadata at write time, and the resolved embed data is stored alongside the post. This "URL-paste-to-embed" flow avoids the Spotify Web API entirely, which is critical given the February 2026 restrictions on Development Mode apps.

The existing codebase provides strong patterns to follow: the lineups CRUD from Backyard Marquee demonstrates the Express route → parameterized SQL → JSON response pattern; the tag system (`insertTags` with sanitization, max 5, lowercase, deduped) is directly reusable; the auth middleware (`authenticateToken`) and API client (Axios with JWT interceptor) are already in place. The server uses ESM (`"type": "module"`), so ESM-only packages (nanoid v5, react-markdown v10) work without configuration.

**Primary recommendation:** Build post CRUD and embed parsing as a unified feature, not separately. The embed is not decorative -- it is the core product ("the music is right there to listen to"). Store structured embed data (provider, type, embed_url, original_url, title, thumbnail_url) in a `post_embeds` table, never raw iframe HTML.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POST-01 | Contributor can create a text post with ~800 character soft limit | Database schema (posts table with TEXT body), server-side validation (reject >1200 chars hard limit), client-side character counter with react-textarea-autosize, sanitization (strip HTML, trim) |
| POST-02 | Contributor can embed a Spotify track/album by pasting a URL | Spotify oEmbed API (no auth required), regex URL parsing for track/album IDs, iframe embed at `open.spotify.com/embed/{type}/{id}`, client-side preview before publish, server-side metadata fetch and storage in post_embeds table |
| POST-03 | Contributor can embed an Apple Music track/album by pasting a URL | Apple Music iframe embed at `embed.music.apple.com/{region}/{type}/{id}`, regex URL parsing, required sandbox attributes on iframe, client-side preview, server-side URL validation and storage |
| POST-04 | Contributor can add up to 5 tags per post | post_tags table with (post_id, tag) composite primary key, same tag sanitization pattern as Backyard Marquee lineups (lowercase, strip special chars, max 30 chars each, dedup), server-side max 5 enforcement |
| POST-05 | Contributor can edit their own published posts | PUT /api/posts/:id with ownership check (post.author_id === req.user.id), delete-and-reinsert pattern for tags and embeds (same as Backyard Marquee lineup updates), updated_at timestamp |
| POST-06 | Contributor can delete their own posts | DELETE /api/posts/:id with ownership check, cascade delete of post_tags and post_embeds via ON DELETE CASCADE or manual cleanup |
</phase_requirements>

## Standard Stack

### Core (Already Installed)

These are carried from Phase 1 -- no new installation needed.

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | 18.3.1 | Frontend UI | Installed (client) |
| Vite | 5.4.10 | Build tooling | Installed (client) |
| Tailwind CSS | 3.4.14 | Styling | Installed (client) |
| React Router | 6.28.0 | Client routing | Installed (client) |
| Axios | 1.7.7 | HTTP client with auth interceptor | Installed (client) |
| Express | 5.1.0 | API server | Installed (server) |
| @libsql/client | 0.14.0 | Turso database driver | Installed (server) |
| jsonwebtoken | 9.0.2 | JWT generation/verification | Installed (server) |
| express-rate-limit | 8.2.1 | Per-endpoint rate limiting | Installed (server) |

### New Dependencies for Phase 2

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-textarea-autosize | 8.5.9 | Auto-growing textarea for post composition | 1,528 npm dependents, 1.3KB gzipped, drop-in `<textarea>` replacement. Perfect for variable-length short posts |
| nanoid | 5.x | Generate URL-friendly unique IDs for post slugs | 118 bytes, cryptographically secure, URL-safe alphabet. Server uses ESM so v5 works natively |

### External APIs (No Libraries Needed)

| API | Endpoint | Purpose | Auth Required |
|-----|----------|---------|---------------|
| Spotify oEmbed | `GET https://open.spotify.com/oembed?url={url}` | Fetch embed metadata (title, thumbnail, iframe HTML) for Spotify URLs | None |
| Spotify Embed | iframe `src="https://open.spotify.com/embed/{type}/{id}"` | Render Spotify players inline | None |
| Apple Music Embed | iframe `src="https://embed.music.apple.com/{region}/{type}/{id}"` | Render Apple Music players inline | None |

### Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Plain `<textarea>` + react-textarea-autosize | Tiptap, Lexical, Quill (rich text editors) | Massive overkill for 500-800 char plain text posts. Adds 50KB+, content serialization complexity, and fights the "text-first" product philosophy. Out of scope per PROJECT.md |
| Spotify oEmbed (no auth) | Spotify Web API (requires OAuth) | Web API requires Premium subscription, is limited to 5 users in Dev Mode since Feb 2026, and is unnecessary -- oEmbed gives us title + thumbnail for free |
| nanoid for slug generation | uuid v4 | nanoid is shorter (21 chars vs 36), URL-friendly, and sufficient for post IDs. No RFC 4122 compliance needed |
| Direct iframe embeds | react-spotify-embed npm package | The npm package (1.8K weekly downloads) is a trivial iframe wrapper. Build a 20-line component instead of adding a dependency |
| Apple Music iframe embeds | MusicKit JS SDK | MusicKit requires Apple Developer account, developer tokens, and 200KB+ SDK. Simple iframe embeds at `embed.music.apple.com` work with zero auth |

### Installation

```bash
# Client
cd client && npm install react-textarea-autosize

# Server
cd server && npm install nanoid
```

Note: react-markdown and remark-gfm are NOT needed for Phase 2. Posts are plain text stored and rendered as-is. Markdown rendering is a future consideration if the format evolves, but the current product philosophy is "plain text, the writing carries the experience."

## Architecture Patterns

### Recommended Project Structure (New Files)

```
client/src/
├── pages/
│   ├── CreatePost.jsx       # Post composer (contributors only)
│   └── EditPost.jsx         # Post editor (contributors only, loads existing post)
├── components/
│   ├── PostForm.jsx          # Shared form: textarea, char counter, embed input, tags
│   ├── EmbedInput.jsx        # URL paste field + live iframe preview
│   ├── EmbedPreview.jsx      # Renders Spotify or Apple Music iframe from parsed URL
│   └── TagInput.jsx          # Tag entry with max 5, remove buttons
└── utils/
    └── embedParser.js        # Parse Spotify/Apple Music URLs → { provider, type, id, embedUrl }

server/
├── db/index.js               # ADD: posts, post_embeds, post_tags tables + indexes (via migration)
├── routes/
│   └── posts.js              # NEW: POST/GET/PUT/DELETE /api/posts, embed metadata fetch
└── index.js                  # ADD: mount postsRoutes
```

### Pattern 1: Embed URL Detection and Resolution

**What:** When a contributor pastes a Spotify or Apple Music URL, the system detects the provider, extracts the content ID, and constructs the embed iframe URL. This happens in two places: client-side for instant preview, server-side for validation and metadata fetch at write time.

**Why dual parsing:** Client parse gives instant feedback (contributor sees the embed preview immediately). Server parse is the source of truth (validates the URL, fetches metadata via oEmbed, stores structured data). If a malicious client sends a non-music URL, the server rejects it.

**Example:**
```javascript
// client/src/utils/embedParser.js (ALSO usable server-side)
const SPOTIFY_REGEX = /https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/;
const APPLE_MUSIC_REGEX = /https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|playlist|song)\/[^/]+\/([0-9]+)(\?i=([0-9]+))?/;

export function parseEmbedUrl(url) {
  if (!url) return null;

  const spotifyMatch = url.match(SPOTIFY_REGEX);
  if (spotifyMatch) {
    return {
      provider: 'spotify',
      type: spotifyMatch[1],       // track, album, playlist
      id: spotifyMatch[2],
      embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`,
      originalUrl: url,
    };
  }

  const appleMatch = url.match(APPLE_MUSIC_REGEX);
  if (appleMatch) {
    const region = appleMatch[1];
    const type = appleMatch[2];
    const collectionId = appleMatch[3];
    const songId = appleMatch[5]; // from ?i= param
    const embedPath = songId
      ? `${region}/${type}/x/${collectionId}?i=${songId}`
      : `${region}/${type}/x/${collectionId}`;
    return {
      provider: 'apple',
      type: songId ? 'song' : type,
      id: songId || collectionId,
      embedUrl: `https://embed.music.apple.com/${embedPath}`,
      originalUrl: url,
    };
  }

  return null;
}
```
Source: Spotify oEmbed API reference (https://developer.spotify.com/documentation/embeds/reference/oembed), Apple Music embed format (https://discussions.apple.com/thread/252671168)

### Pattern 2: Server-Side oEmbed Metadata Fetch

**What:** When a post is created or edited with a Spotify embed, the server calls the Spotify oEmbed API to fetch the title and thumbnail URL. This metadata is stored alongside the embed and will be used later (Phase 5) for OG meta tags in social sharing previews.

**When to use:** Only on post create/update, never on read. Metadata is fetched once and cached in the database.

**Example:**
```javascript
// server/routes/posts.js
async function fetchSpotifyMetadata(spotifyUrl) {
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || null,
      thumbnailUrl: data.thumbnail_url || null,
    };
  } catch {
    return null; // Non-fatal: embed still works without metadata
  }
}
```
Source: Spotify oEmbed API (https://developer.spotify.com/documentation/embeds/reference/oembed) -- returns `title`, `thumbnail_url`, `html`, no auth required.

### Pattern 3: Post CRUD Following Existing Codebase Conventions

**What:** Post routes follow the same patterns established in Phase 1 (invites.js, users.js, auth.js) and the Backyard Marquee lineups.js: Express Router, authenticateToken middleware, parameterized SQL, sanitize function, rate limiting, JSON responses with camelCase keys.

**Key conventions from existing code:**
- `sanitize(str, maxLength)` function strips HTML and enforces length (from lineups.js)
- Tags: `insertTags(postId, tags)` with lowercase, special char stripping, dedup, max 5 (from lineups.js)
- Ownership checks: `if (post.author_id !== req.user.id) return 403` (from lineups.js delete/update)
- Edit pattern: update main record, delete-and-reinsert related records (tags, embeds) (from lineups.js PUT)
- Rate limiting: per-endpoint with express-rate-limit (from auth.js)

### Pattern 4: Embed Iframe Rendering

**What:** Client-side component renders an iframe for either Spotify or Apple Music based on stored embed data. Critical: the iframe `allow` and `sandbox` attributes differ between providers.

**Example:**
```jsx
// client/src/components/EmbedPreview.jsx
export default function EmbedPreview({ embed }) {
  if (!embed) return null;

  if (embed.provider === 'spotify') {
    const height = embed.type === 'track' ? 152 : 352;
    return (
      <iframe
        src={embed.embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={embed.title || 'Spotify embed'}
      />
    );
  }

  if (embed.provider === 'apple') {
    const height = embed.type === 'song' ? 150 : 450;
    return (
      <iframe
        src={embed.embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
        allow="autoplay *; encrypted-media *; fullscreen *; picture-in-picture *"
        style={{ maxWidth: '660px' }}
        title={embed.title || 'Apple Music embed'}
      />
    );
  }

  return null;
}
```
Source: Spotify Embeds docs (https://developer.spotify.com/documentation/embeds), Apple Music embed community documentation

### Anti-Patterns to Avoid

- **Storing raw iframe HTML:** Never store the `html` field from Spotify oEmbed as the embed representation. Store structured data (provider, type, id, embedUrl). The iframe HTML is a rendering concern, not a data concern. Changing embed dimensions or attributes later would require a data migration.
- **Client-only URL parsing without server validation:** The client parses for preview, but the server must re-validate. A malicious client could send any URL as an "embed." Server-side: allowlist only `open.spotify.com` and `music.apple.com` domains.
- **Eager iframe rendering in lists:** For Phase 2, posts are created/edited one at a time (no feed yet). But the EmbedPreview component should be built with the knowledge that Phase 3 will render many posts in a feed. Use a "click to load" pattern or at minimum ensure the component can be lazy-loaded. Do NOT render iframes eagerly in any list context.
- **Using Spotify Web API when oEmbed suffices:** The oEmbed endpoint requires no auth and returns everything needed (title, thumbnail, embed HTML). The Web API requires OAuth credentials, has restrictive rate limits, and is subject to the February 2026 Dev Mode restrictions. Avoid it entirely for Phase 2.

## Database Schema

New tables added via migration in `server/db/index.js`:

```sql
-- Core content
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  body TEXT NOT NULL,
  author_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Music embeds (zero or one per post)
CREATE TABLE IF NOT EXISTS post_embeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  embed_type TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  original_url TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Tags (many-to-many, max 5 per post enforced in application)
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (post_id, tag),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Indexes for future feed performance (Phase 3)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);
```

**Schema decisions:**
- `slug` is a nanoid-generated URL-friendly string (e.g., `V1StGXR8_Z5jdHi6B-myT`), not derived from content. Posts are short takes without titles, so there is no meaningful content to slugify.
- `body` has no SQL-level length constraint -- validation happens in application code (soft limit ~800, hard limit ~1200 chars).
- `post_embeds` uses `UNIQUE(post_id)` because each post has at most one embed. This is a 1:0..1 relationship.
- `ON DELETE CASCADE` on foreign keys ensures deleting a post automatically removes its embed and tags.
- `updated_at` tracks when the post was last edited. Set to `CURRENT_TIMESTAMP` on create, updated explicitly on edit.
- Indexes on `created_at DESC`, `author_id`, and `tag` are added now even though the feed (Phase 3) is not built yet. Adding indexes later requires a migration; adding them now costs nothing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auto-growing textarea | Custom height calculation with resize observer | `react-textarea-autosize` (8.5.9) | Browser inconsistencies in textarea height calculation, scroll behavior edge cases, 1.3KB library handles all of it |
| URL-friendly unique IDs | `Math.random().toString(36)` or custom generator | `nanoid` (v5) | Cryptographically secure, collision-resistant, 118 bytes, URL-safe alphabet by default |
| HTML sanitization of user input | Regex-based tag stripping | Existing `sanitize()` function from codebase (strip HTML tags, enforce max length, trim) | Already proven in the codebase, handles the simple case of plain text posts. No need for DOMPurify when the content model is plain text only |
| Embed URL validation | Loose string matching | Regex with domain allowlist (only `open.spotify.com`, `music.apple.com`) | Prevents arbitrary iframe injection; the regex patterns are well-established (see Architecture Pattern 1) |

**Key insight:** Phase 2 is deliberately minimal in new dependencies. The existing codebase already has sanitization, rate limiting, auth middleware, and the CRUD pattern. Two new packages (react-textarea-autosize, nanoid) is all that's needed.

## Common Pitfalls

### Pitfall 1: Spotify Embed `allow` Attribute Omission

**What goes wrong:** Removing or modifying the `allow="encrypted-media"` attribute on the Spotify iframe causes it to fall back to 30-second preview-only playback. The embed looks like it works but premium users cannot play full tracks.
**Why it happens:** Developers clean up iframe attributes or copy partial embed code. The `encrypted-media` permission is not obviously necessary.
**How to avoid:** Always include the full `allow` attribute string: `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"`. Never modify the iframe attributes programmatically. Build the EmbedPreview component once with correct attributes and reuse it everywhere.
**Warning signs:** Spotify embeds only play 30-second clips; console warning "Spotify was not able to play encrypted media."
**Confidence:** HIGH -- verified via Spotify official troubleshooting docs (https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting)

### Pitfall 2: Apple Music Embed Missing Sandbox Attributes

**What goes wrong:** Apple Music iframe embeds require specific sandbox attributes to function. Missing any of them silently breaks functionality -- the play button may not work, the "open in Apple Music" link may not navigate, or the embed may show a blank white rectangle.
**Why it happens:** Developers omit the `sandbox` attribute (which is optional on iframes generally) or include only a subset of the required permissions.
**How to avoid:** Always include the full sandbox attribute: `sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"`. Test Apple Music embeds in production (not just development) because some sandbox behaviors differ by origin.
**Warning signs:** Apple Music embed shows but play button does nothing; "Open in Apple Music" link fails to navigate.
**Confidence:** HIGH -- verified via Apple community documentation and multiple implementation references.

### Pitfall 3: Apple Music Country Code Lock-In

**What goes wrong:** Apple Music embed URLs contain a hardcoded country code (e.g., `/us/album/...`). Content availability varies by storefront. A US link may not work for a UK reader.
**Why it happens:** Contributors paste links from their own Apple Music app, which includes their local storefront code. The embed is tested only in the contributor's region.
**How to avoid:** Use `us` as the default storefront for embed URLs (broadest catalog). Extract the content ID but normalize the region. Display the original URL as a fallback "Listen on Apple Music" link that opens the user's native app, which handles storefront resolution.
**Warning signs:** Bug reports about blank Apple Music embeds from non-US readers.
**Confidence:** MEDIUM -- documented in multiple community sources; exact behavior depends on Apple's current embed policy.

### Pitfall 4: No Server-Side Content Length Validation

**What goes wrong:** The UI has a character counter showing ~800 chars, but the API accepts any length. A direct API call or a bug in the frontend can create a 50,000-character post that breaks layout assumptions everywhere.
**Why it happens:** Developers rely on client-side validation and forget that the API is the real boundary.
**How to avoid:** Server-side: reject posts with body > 1200 characters (hard limit, with buffer above the 800 soft limit). Return 400 with a clear error message. This matches the existing `sanitize(str, maxLength)` pattern in the codebase.
**Warning signs:** Unusually long posts that break the feed layout.
**Confidence:** HIGH -- standard input validation practice. The existing codebase already does this for lineups (100 char title, 500 char description, 300 char notes).

### Pitfall 5: Storing Embed as Raw HTML Instead of Structured Data

**What goes wrong:** Storing the Spotify oEmbed `html` field (raw iframe HTML) means you cannot change embed dimensions, add/remove iframe attributes, extract metadata for OG tags, or support different embed layouts (compact vs expanded) without a data migration.
**Why it happens:** The oEmbed API literally returns an `html` field with a ready-to-use iframe. It's tempting to store and render it directly.
**How to avoid:** Store structured data: `provider`, `embed_type`, `embed_url`, `original_url`, `title`, `thumbnail_url`. Render the iframe client-side from these fields. This is cheaper to store, flexible to render, and future-proof.
**Warning signs:** A column named `embed_html` in the schema; inability to change embed appearance without a migration.
**Confidence:** HIGH -- architectural best practice documented in the project's own ARCHITECTURE.md research.

### Pitfall 6: Embed URL Not Server-Validated Against Domain Allowlist

**What goes wrong:** The server accepts any URL as an embed source, which means a malicious contributor could inject an iframe pointing to an attacker-controlled domain, enabling phishing or data exfiltration within the page context.
**Why it happens:** The client-side regex parser only matches Spotify/Apple URLs, so developers assume invalid URLs "can't get through." But the client is untrusted.
**How to avoid:** Server-side: after parsing the embed URL, verify the resulting `embedUrl` starts with `https://open.spotify.com/embed/` or `https://embed.music.apple.com/`. Reject anything else.
**Warning signs:** Post embeds pointing to domains other than Spotify or Apple Music.
**Confidence:** HIGH -- standard input validation / security practice.

## Code Examples

### Post Creation API Route

```javascript
// server/routes/posts.js
import { Router } from 'express';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import db from '../db/index.js';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many posts created, try again later' },
});

function sanitize(str, maxLength) {
  if (str == null) return null;
  return String(str).trim().replace(/<[^>]*>/g, '').slice(0, maxLength);
}

async function insertTags(postId, tags) {
  if (!Array.isArray(tags)) return;
  const seen = new Set();
  for (const raw of tags.slice(0, 5)) {
    const tag = String(raw).toLowerCase().replace(/[^a-z0-9\- ]/g, '').trim().slice(0, 30);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      await db.run('INSERT OR IGNORE INTO post_tags (post_id, tag) VALUES (?, ?)', postId, tag);
    }
  }
}

// POST /api/posts
router.post('/', authenticateToken, createLimiter, async (req, res) => {
  const body = sanitize(req.body.body, 1200); // Hard limit
  const { embed, tags } = req.body;

  if (!body || body.length === 0) {
    return res.status(400).json({ error: 'Post body is required' });
  }

  try {
    const slug = nanoid();

    const result = await db.run(
      'INSERT INTO posts (slug, body, author_id) VALUES (?, ?, ?)',
      slug, body, req.user.id
    );
    const postId = result.lastInsertRowid;

    // Insert embed if provided
    if (embed && embed.provider && embed.embedUrl) {
      // Server-side domain allowlist check
      const validDomains = [
        'https://open.spotify.com/embed/',
        'https://embed.music.apple.com/',
      ];
      if (validDomains.some(d => embed.embedUrl.startsWith(d))) {
        let metadata = {};
        if (embed.provider === 'spotify') {
          metadata = await fetchSpotifyMetadata(embed.originalUrl) || {};
        }
        await db.run(
          `INSERT INTO post_embeds (post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          postId, embed.provider, embed.type, embed.embedUrl,
          embed.originalUrl, metadata.title || null, metadata.thumbnailUrl || null
        );
      }
    }

    await insertTags(postId, tags);

    res.status(201).json({ id: postId, slug });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});
```

### Post Composer Component

```jsx
// client/src/components/PostForm.jsx
import { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import EmbedInput from './EmbedInput';
import TagInput from './TagInput';

const SOFT_LIMIT = 800;
const HARD_LIMIT = 1200;

export default function PostForm({ initialData, onSubmit, submitting }) {
  const [body, setBody] = useState(initialData?.body || '');
  const [embed, setEmbed] = useState(initialData?.embed || null);
  const [tags, setTags] = useState(initialData?.tags || []);

  const charCount = body.length;
  const overSoft = charCount > SOFT_LIMIT;
  const overHard = charCount > HARD_LIMIT;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim() || overHard) return;
    onSubmit({ body: body.trim(), embed, tags });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <TextareaAutosize
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What are you listening to?"
          minRows={4}
          className="w-full resize-none border border-gray-300 rounded-lg p-4 text-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <div className={`text-right text-sm mt-1 ${overHard ? 'text-red-600 font-medium' : overSoft ? 'text-amber-600' : 'text-gray-400'}`}>
          {charCount} / ~{SOFT_LIMIT}
        </div>
      </div>

      <EmbedInput embed={embed} onChange={setEmbed} />
      <TagInput tags={tags} onChange={setTags} maxTags={5} />

      <button
        type="submit"
        disabled={!body.trim() || overHard || submitting}
        className="bg-gray-900 text-white px-6 py-3 text-sm font-medium rounded hover:bg-gray-800 transition disabled:opacity-50"
      >
        {submitting ? 'Publishing...' : 'Publish'}
      </button>
    </form>
  );
}
```

### Embed URL Input with Live Preview

```jsx
// client/src/components/EmbedInput.jsx
import { useState } from 'react';
import { parseEmbedUrl } from '../utils/embedParser';
import EmbedPreview from './EmbedPreview';

export default function EmbedInput({ embed, onChange }) {
  const [url, setUrl] = useState(embed?.originalUrl || '');
  const [error, setError] = useState('');

  const handlePaste = (e) => {
    const pastedUrl = e.clipboardData.getData('text');
    setUrl(pastedUrl);
    const parsed = parseEmbedUrl(pastedUrl);
    if (parsed) {
      onChange(parsed);
      setError('');
    } else if (pastedUrl.trim()) {
      setError('Paste a Spotify or Apple Music track/album URL');
      onChange(null);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    if (!val.trim()) {
      onChange(null);
      setError('');
      return;
    }
    const parsed = parseEmbedUrl(val);
    if (parsed) {
      onChange(parsed);
      setError('');
    } else {
      setError('Paste a Spotify or Apple Music track/album URL');
      onChange(null);
    }
  };

  const handleRemove = () => {
    setUrl('');
    onChange(null);
    setError('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Music embed (optional)
      </label>
      <input
        type="url"
        value={url}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="Paste a Spotify or Apple Music URL"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      {embed && (
        <div className="mt-3">
          <EmbedPreview embed={embed} />
          <button
            type="button"
            onClick={handleRemove}
            className="text-sm text-gray-500 hover:text-red-600 mt-2"
          >
            Remove embed
          </button>
        </div>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spotify Web API for all interactions | oEmbed API for embed metadata (no auth needed) | Feb 2026 restrictions made Web API impractical for small apps | Simpler, more reliable, no API key dependency |
| MusicKit JS for Apple Music embeds | Simple iframe embeds at embed.music.apple.com | Always available but MusicKit overshadowed in docs | No Apple Developer account needed, zero JS overhead |
| Rich text editors (Draft.js, Quill) for blog posts | Plain textarea for short-form content | Draft.js archived 2023; product philosophy shift toward constraints | Simpler, lighter, matches the "paragraph, not essay" format |
| react-markdown v8 (CJS + ESM) | react-markdown v10 (ESM only) | v10 released mid-2024 | Must use ESM imports; works natively with Vite |
| nanoid v3 (CJS + ESM) | nanoid v5 (ESM only) | v4+ ESM only | Project uses `"type": "module"`, so v5 works natively |

**Deprecated/outdated:**
- Draft.js: Archived by Meta in 2023. Do not use for new projects.
- Quill.js: Aging API, unclear maintenance. Avoid.
- Spotify Web API for embed purposes: Use oEmbed instead. Web API's Feb 2026 Dev Mode restrictions (5-user limit, Premium required) make it unsuitable for features that oEmbed handles for free.

## Open Questions

1. **Embed limit per post: exactly one or allow multiple?**
   - What we know: The schema uses `UNIQUE(post_id)` on `post_embeds`, limiting to one embed per post. The product model is short takes -- one song/album per take makes sense.
   - What's unclear: Whether a future post type might reference multiple tracks (e.g., "these two songs are in conversation with each other").
   - Recommendation: Start with one embed per post. The UNIQUE constraint is easy to drop later if multi-embed becomes needed. Keep it simple for v1.

2. **Post slug format: nanoid vs content-derived slug?**
   - What we know: Posts have no title (they are short takes), so there is no natural content to slugify. A nanoid slug (e.g., `V1StGXR8_Z5jdHi6B-myT`) is unique by construction.
   - What's unclear: Whether human-readable URLs (derived from first few words) matter for this product.
   - Recommendation: Use nanoid. Content-derived slugs add complexity (collision handling, profanity filtering, encoding issues) for no real SEO or UX benefit on untitled short-form posts.

3. **Should the embed preview iframe load automatically on URL paste, or require a "Preview" button click?**
   - What we know: Spotify/Apple Music iframes load external resources. Auto-loading on paste is faster for the contributor. A "Preview" button is more conservative.
   - What's unclear: Whether auto-loading feels too aggressive or whether the preview delay frustrates contributors.
   - Recommendation: Auto-load on paste. The contributor has explicitly chosen to paste a URL. Embedding a single iframe during composition is not a performance concern (the pitfall of multiple iframes applies to feeds, not single-post editing).

## Sources

### Primary (HIGH confidence)
- [Spotify oEmbed API Reference](https://developer.spotify.com/documentation/embeds/reference/oembed) -- endpoint, parameters, response format, no auth required
- [Spotify Embeds Documentation](https://developer.spotify.com/documentation/embeds) -- embed types, iframe attributes, customization
- [Spotify Embeds Troubleshooting](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting) -- `encrypted-media` requirement, browser compatibility
- [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api) -- programmatic embed loading for future feed optimization
- [react-textarea-autosize npm](https://www.npmjs.com/package/react-textarea-autosize) -- v8.5.9, 1,528 dependents
- [nanoid npm](https://www.npmjs.com/package/nanoid) -- v5.x, ESM only, 118 bytes
- [react-markdown npm](https://www.npmjs.com/package/react-markdown) -- v10, ESM only, React 18 required (noted for future reference, not used in Phase 2)
- Existing codebase: `server/routes/lineups.js` -- sanitize, insertTags, CRUD patterns; `server/db/index.js` -- migration runner; `client/src/api/client.js` -- Axios interceptor

### Secondary (MEDIUM confidence)
- [Apple Music embed format](https://discussions.apple.com/thread/252671168) -- iframe URL structure, sandbox attributes, no API key
- [Apple Music embed how-to](https://allthings.how/how-to-embed-apple-music-playlists-albums-and-songs-on-a-webpage/) -- practical implementation
- [Apple Music embed via Iframely](https://iframely.com/domains/apple-music) -- responsive embed reference
- [Spotify Community: playlist-v2 URL issues](https://community.spotify.com/t5/Other-Podcasts-Partners-etc/Oembed-problems/td-p/5217628) -- known oEmbed issue with v2 URLs
- Project research: `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`, `.planning/research/FEATURES.md`

### Tertiary (LOW confidence)
- [Spotify embed iframe playback blocked (Aug 2025)](https://community.spotify.com/t5/Spotify-for-Developers/BUG-Spotify-Embed-iframe-playback-suddenly-blocked-was-working/td-p/6931733) -- CSP-related issue affecting some embeds, unclear resolution status. Worth monitoring but not a blocking concern for tracks/albums.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified via npm, versions confirmed, ESM compatibility verified against project setup
- Architecture: HIGH -- patterns directly adapted from existing codebase (lineups.js CRUD, tag insertion, auth middleware) plus verified external API documentation
- Pitfalls: HIGH -- Spotify embed attributes verified via official troubleshooting docs; Apple Music sandbox attributes verified via multiple community sources; server validation is standard security practice
- Embed integration: HIGH -- Spotify oEmbed is well-documented, no-auth API; Apple Music iframe format is stable since 2021

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain -- embed APIs rarely change; npm package versions are pinned)
