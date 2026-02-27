# Architecture Research

**Domain:** Music micro-blogging platform (short-form music commentary with streaming embeds)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
                          PUBLIC READERS (no auth)
                                  |
                                  v
  ┌──────────────────────────────────────────────────────────────────┐
  │                        React SPA (Vite)                          │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
  │  │   Feed   │  │  Single  │  │  Browse   │  │  Contributor │    │
  │  │   Page   │  │   Post   │  │ (Artist/  │  │   Dashboard  │    │
  │  │          │  │   Page   │  │   Tag)    │  │  (auth req)  │    │
  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
  │       │              │             │               │            │
  │  ┌────┴──────────────┴─────────────┴───────────────┴──────┐     │
  │  │              Axios API Client + Auth Interceptor         │     │
  │  └─────────────────────────┬───────────────────────────────┘     │
  └────────────────────────────┼─────────────────────────────────────┘
                               │  /api/*
                               v
  ┌──────────────────────────────────────────────────────────────────┐
  │                      Express API Server                          │
  │                                                                  │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
  │  │  Auth Routes  │  │ Post Routes  │  │  Browse/Feed Routes  │   │
  │  │  (invite,     │  │ (CRUD, embed │  │  (feed, artist,      │   │
  │  │   login)      │  │  parsing)    │  │   tag, search)       │   │
  │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
  │         │                 │                      │              │
  │  ┌──────┴─────────────────┴──────────────────────┴──────────┐   │
  │  │                    Middleware Layer                        │   │
  │  │  auth.js (JWT verify) | sanitize.js | rate-limit.js       │   │
  │  └──────────────────────────┬────────────────────────────────┘   │
  │                             │                                   │
  │  ┌──────────────────────────┴────────────────────────────────┐   │
  │  │               OG Meta Tag Handler                          │   │
  │  │  (bot detection -> serve meta tags for social previews)    │   │
  │  └───────────────────────────────────────────────────────────┘   │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              v                  v                  v
  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
  │  Turso (libSQL)  │  │ Spotify API  │  │  Apple Music     │
  │  - posts         │  │ (oEmbed for  │  │  (embed URL      │
  │  - users         │  │  metadata)   │  │   construction)  │
  │  - tags          │  │              │  │                  │
  │  - likes         │  └──────────────┘  └──────────────────┘
  │  - comments      │
  │  - invites       │
  └──────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| React SPA | Render UI, manage client state, handle routing | Vite + React Router 6 + Tailwind |
| Axios Client | API communication, attach JWT, handle errors | Centralized client with auth interceptor |
| Express API | Business logic, auth, CRUD, embed resolution | Route handlers + middleware chain |
| Auth Middleware | Verify JWT, enforce contributor-only write access | `auth.js` with required/optional variants |
| Sanitization | Strip HTML, enforce length limits, trim input | Server-side validation on all user input |
| OG Meta Handler | Detect social crawlers, serve dynamic meta tags | Bot user-agent detection in Express |
| Embed Parser | Extract Spotify/Apple Music URLs, resolve metadata | Regex extraction + oEmbed/URL construction |
| Turso DB | Persistent storage for all application data | @libsql/client with parameterized queries |
| Spotify oEmbed | Fetch embed metadata (title, thumbnail, iframe) | Server-side GET to `open.spotify.com/oembed` |

## Recommended Project Structure

```
client/src/
├── pages/                 # Route-level components
│   ├── Feed.jsx           # Main chronological feed (public)
│   ├── Post.jsx           # Single post view (public)
│   ├── BrowseArtist.jsx   # Posts filtered by artist (public)
│   ├── BrowseTag.jsx      # Posts filtered by tag (public)
│   ├── CreatePost.jsx     # Post composer (contributors only)
│   ├── EditPost.jsx       # Post editor (contributors only)
│   ├── Profile.jsx        # Contributor public profile
│   ├── Login.jsx          # Contributor login
│   └── AcceptInvite.jsx   # Invite acceptance + account setup
├── components/            # Reusable UI components
│   ├── PostCard.jsx       # Single post in feed context
│   ├── MusicEmbed.jsx     # Spotify/Apple Music embed renderer
│   ├── EmbedInput.jsx     # URL input + preview for post creation
│   ├── TagList.jsx        # Tag display/navigation
│   ├── Comments.jsx       # Comment thread
│   ├── LikeButton.jsx     # Like interaction
│   ├── ShareButton.jsx    # Share/copy link
│   └── Navbar.jsx         # Site navigation
├── context/
│   └── AuthContext.jsx    # Auth state (contributor sessions)
├── hooks/
│   ├── useFeed.js         # Feed data fetching + pagination
│   └── useEmbed.js        # Embed URL parsing + preview
├── api/
│   └── client.js          # Axios instance with interceptor
├── utils/
│   ├── embedParser.js     # Extract Spotify/Apple Music URLs from text
│   └── formatDate.js      # Date formatting helpers
└── App.jsx                # Router setup

server/
├── index.js               # Express app, CORS, static serve, OG handler
├── db/
│   └── index.js           # Turso client, schema, migrations
├── middleware/
│   ├── auth.js            # JWT verify, requireAuth, optionalAuth
│   ├── sanitize.js        # Input sanitization middleware
│   └── rateLimit.js       # Rate limiting per endpoint
└── routes/
    ├── auth.js            # Login, invite accept, token refresh
    ├── posts.js           # CRUD, likes, comments
    ├── embeds.js          # Spotify oEmbed proxy, embed metadata
    ├── browse.js          # Feed, artist, tag, search queries
    └── admin.js           # Invite management (admin only)
```

### Structure Rationale

- **`pages/` vs `components/`:** Pages are route-level (one per URL), components are reusable across pages. This mirrors the Backyard Marquee pattern and keeps routing obvious.
- **`hooks/`:** Custom hooks for data fetching and embed logic keep components declarative. Feed pagination logic belongs in a hook, not scattered across pages.
- **`utils/embedParser.js`:** Centralized embed URL detection is critical. Both the post creation form and the post renderer need to identify and transform music URLs. One module, two consumers.
- **Server `routes/` split:** Separate `posts.js` (CRUD), `browse.js` (read-only queries), `embeds.js` (external API proxy), and `admin.js` (invite management). This matches how auth requirements differ: browse is public, posts require contributor auth, admin requires admin role.
- **`middleware/sanitize.js`:** Extracted from route handlers into dedicated middleware. Posts accept user-generated text that must be sanitized before storage. This is better as middleware than inline validation.

## Architectural Patterns

### Pattern 1: Embed URL Detection and Resolution

**What:** When a contributor creates a post, they paste a Spotify or Apple Music URL. The system detects the URL type, fetches metadata (title, artist, thumbnail), and stores both the original URL and the resolved embed data.

**When to use:** Every post creation and edit flow.

**Trade-offs:** Resolving at write-time (not read-time) means faster page loads but stale metadata if the external service changes. This is the right trade-off -- music metadata rarely changes.

**Example:**
```javascript
// utils/embedParser.js
const SPOTIFY_REGEX = /https?:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/;
const APPLE_MUSIC_REGEX = /https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|playlist|song)\/[^/]+\/(\d+)(\?i=(\d+))?/;

function parseEmbedUrl(url) {
  const spotifyMatch = url.match(SPOTIFY_REGEX);
  if (spotifyMatch) {
    return {
      provider: 'spotify',
      type: spotifyMatch[1],       // track, album, playlist, artist
      id: spotifyMatch[2],
      embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`
    };
  }

  const appleMatch = url.match(APPLE_MUSIC_REGEX);
  if (appleMatch) {
    const region = appleMatch[1];
    const type = appleMatch[2];
    const collectionId = appleMatch[3];
    const songId = appleMatch[5]; // from ?i= param
    return {
      provider: 'apple',
      type: songId ? 'song' : type,
      id: songId || collectionId,
      embedUrl: `https://embed.music.apple.com/${region}/${type}/${collectionId}${songId ? '?i=' + songId : ''}`
    };
  }

  return null;
}
```

### Pattern 2: Dual-Mode Server (SPA + OG Meta Tags)

**What:** Express serves the React SPA for normal requests but intercepts social crawler requests to inject dynamic OG meta tags. This lets social platforms (Twitter, iMessage, Slack) show rich link previews without full SSR.

**When to use:** Every shareable post needs a social preview with title, excerpt, and optionally album art.

**Trade-offs:** Adds complexity to the Express server but avoids the massive overhead of full SSR or a framework switch to Next.js. The builder already implemented this pattern in Backyard Marquee.

**Example:**
```javascript
// index.js - OG meta tag injection
const BOT_USER_AGENTS = /bot|crawl|spider|facebook|twitter|slack|discord|telegram|whatsapp|linkedin/i;

app.get('/post/:slug', (req, res, next) => {
  if (!BOT_USER_AGENTS.test(req.get('user-agent'))) {
    return next(); // Let SPA handle it
  }

  // Fetch post data, return HTML with OG tags
  const post = await db.getPost(req.params.slug);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta property="og:title" content="${post.title || 'Involuntary Response'}" />
      <meta property="og:description" content="${post.body.substring(0, 200)}" />
      <meta property="og:image" content="${post.thumbnail_url || '/default-og.png'}" />
      <meta property="og:url" content="https://involuntaryresponse.com/post/${post.slug}" />
    </head>
    <body></body>
    </html>
  `);
});
```

### Pattern 3: Invite-Only Auth with Role Separation

**What:** Three roles: admin (manages invites + posts), contributor (posts), reader (public, no account needed). Admins generate invite tokens. Contributors claim invites by setting username/password. Readers never authenticate.

**When to use:** The entire auth system. No open registration.

**Trade-offs:** Simpler than open registration (no email verification, no spam accounts, no abuse). Limits growth intentionally -- this is a feature, not a bug. The editorial quality depends on controlled access.

**Example:**
```javascript
// Database: invites table
// id | email | invite_token | role | created_by | claimed_at | claimed_by_user_id

// Admin creates invite
app.post('/api/admin/invites', requireAdmin, async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  await db.execute(
    'INSERT INTO invites (email, invite_token, role, created_by) VALUES (?, ?, ?, ?)',
    [req.body.email, token, req.body.role || 'contributor', req.user.id]
  );
  // Return invite link: /invite/{token}
});

// Contributor claims invite
app.post('/api/auth/claim-invite', async (req, res) => {
  const { token, username, password } = req.body;
  const invite = await db.getInvite(token);
  if (!invite || invite.claimed_at) return res.status(400).json({ error: 'Invalid invite' });
  // Create user, mark invite claimed, return JWT
});
```

## Data Flow

### Request Flow

```
[Browser Request]
    |
    v
[Express Server]
    |
    ├── Is bot? ──YES──> [OG Meta Tag Response] (no SPA, just meta tags)
    |
    ├── Is /api/*? ──YES──> [Route Handler]
    |       |
    |       ├── [Auth Middleware] (verify JWT if present)
    |       ├── [Rate Limit Middleware] (check request rate)
    |       ├── [Sanitize Middleware] (clean input on writes)
    |       ├── [Business Logic] (CRUD, embed resolution)
    |       └── [Turso Query] ──> [JSON Response]
    |
    └── Else ──> [Serve React SPA] (client-side routing takes over)
```

### Post Creation Flow (the core write path)

```
[Contributor writes post in CreatePost.jsx]
    |
    v
[EmbedInput: paste Spotify/Apple Music URL]
    |
    ├── [embedParser.js detects provider + type]
    ├── [Preview embed in iframe immediately]  (client-side)
    v
[Submit: POST /api/posts]
    |
    ├── [auth.js: verify JWT, confirm contributor role]
    ├── [sanitize.js: strip HTML, enforce 800 char limit, trim]
    ├── [posts.js: validate, parse embed URL server-side too]
    ├── [embeds.js: call Spotify oEmbed for metadata (title, thumbnail)]
    │   (Apple Music: construct embed URL from parsed components, no API call needed)
    ├── [Generate slug from title/content]
    └── [INSERT into posts, post_tags, post_embeds tables]
         |
         v
    [Return created post with embed metadata]
```

### Feed Read Flow (the core read path)

```
[Reader opens Feed page]
    |
    v
[GET /api/browse/feed?cursor=<last_post_id>]
    |
    ├── [optionalAuth: identify user if logged in (for like state)]
    ├── [browse.js: SELECT posts with embeds, authors, tag counts, like counts]
    ├── [Cursor pagination: WHERE id < cursor ORDER BY created_at DESC LIMIT 20]
    └── [Return posts array + next cursor]
         |
         v
[Feed.jsx renders PostCard list]
    |
    ├── [PostCard: text content + author + timestamp + tags]
    ├── [MusicEmbed: render Spotify/Apple Music iframe from stored embed URL]
    ├── [LikeButton: show count, toggle on click]
    └── [IntersectionObserver on last card triggers next page fetch]
```

### Key Data Flows

1. **Embed resolution:** Contributor pastes URL -> client parses for preview -> server re-parses and fetches oEmbed metadata -> stored alongside post. The client parse is for instant preview; the server parse is the source of truth.

2. **Social sharing:** User shares post link -> social platform crawler hits Express -> bot detection intercepts -> Express queries post from Turso -> returns HTML with OG meta tags (title, excerpt, thumbnail from embed metadata).

3. **Feed pagination:** Client requests feed with cursor -> server queries posts WHERE id < cursor with LIMIT -> returns posts + whether more exist. Cursor-based pagination prevents duplicate/missing posts when new content is added.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k readers | Monolith is perfect. Turso free tier handles this easily. No caching needed. Single Render instance for API. |
| 1k-10k readers | Add response caching for feed/browse routes (in-memory or Redis). Feed queries are the hot path. Turso still handles this fine. |
| 10k-100k readers | CDN for static assets (Vercel already does this). Consider Turso read replicas for geographic distribution. Rate limit more aggressively. |
| 100k+ readers | This is a content site with few writers and many readers -- the read/write ratio is extremely favorable. Turso embedded replicas or edge caching handles this. The architecture does not need to change. |

### Scaling Priorities

1. **First bottleneck:** Feed query performance. Chronological feed with joins (posts + authors + tags + like counts + embed data) gets slow as post count grows. Fix with proper indexes on `created_at`, `author_id`, and cursor-based pagination (already in the design).
2. **Second bottleneck:** Spotify oEmbed calls during post creation. These are external API calls that can be slow or rate-limited. Fix by caching oEmbed responses (same embed URL = same metadata). This is a write-path problem and writes are rare (invite-only contributors), so it will not actually be a bottleneck until there are many contributors posting frequently.

## Anti-Patterns

### Anti-Pattern 1: Client-Side Embed Resolution

**What people do:** Parse and resolve Spotify/Apple Music URLs entirely on the client, storing only the raw URL in the database.
**Why it's wrong:** Every page load re-parses URLs. If the embed format changes, old posts break. Social crawlers get no embed metadata for OG tags. Embed rendering depends on client-side parsing being correct.
**Do this instead:** Parse on the client for instant preview, but always re-parse and resolve on the server at write time. Store the resolved embed URL, provider, type, and fetched metadata (title, thumbnail) in the database.

### Anti-Pattern 2: Offset-Based Feed Pagination

**What people do:** Use `LIMIT 20 OFFSET 40` for feed pagination.
**Why it's wrong:** When new posts are added, offset shifts -- readers see duplicate posts or miss posts entirely. Performance degrades as offset grows (database must scan and discard offset rows).
**Do this instead:** Use cursor-based pagination: `WHERE id < :last_seen_id ORDER BY created_at DESC LIMIT 20`. Stable, performant, and correct when content is added between page loads.

### Anti-Pattern 3: Storing Raw HTML in Post Body

**What people do:** Allow markdown or rich text in post bodies and store rendered HTML.
**Why it's wrong:** For 500-800 character posts, rich text is overkill. It introduces XSS risk, increases storage, and complicates sanitization. The format is short-form plain text, not articles.
**Do this instead:** Store plain text only. Sanitize aggressively (strip all HTML tags). The only "rich" content is the music embed, which is a separate structured field -- not inline in the post body.

### Anti-Pattern 4: MusicKit JS for Apple Music Embeds

**What people do:** Import the full MusicKit JS SDK to embed Apple Music content, requiring an Apple Developer Program membership and developer token management.
**Why it's wrong:** Apple Music provides simple iframe embeds at `embed.music.apple.com` that require zero authentication. MusicKit JS is for building full music players, not embedding a single track preview.
**Do this instead:** Use the iframe embed format: `https://embed.music.apple.com/{region}/{type}/{id}`. No developer token, no SDK, no Apple Developer account required.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Spotify oEmbed | Server-side GET to `open.spotify.com/oembed?url={encoded_url}` | Returns title, thumbnail, iframe HTML. No auth required. Cache responses. |
| Spotify Embed | Client-side iframe: `open.spotify.com/embed/{type}/{id}` | 152px height for tracks, 352px for albums/playlists. Rendered from stored embed URL. |
| Apple Music Embed | Client-side iframe: `embed.music.apple.com/{region}/{type}/{id}` | 150px height. No API key needed. Constructed from parsed URL components. |
| Vercel | Static hosting for React SPA build output | Automatic CDN, preview deploys, custom domain. |
| Render | Express API server hosting | Auto-deploy from git, environment variables, health checks. |
| Turso | Hosted SQLite database via @libsql/client | Serverless-friendly, embedded replicas available, generous free tier. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React SPA <-> Express API | REST over HTTPS (`/api/*` prefix) | Axios client with JWT in Authorization header. Vite dev proxy for local development. |
| Express Routes <-> Turso | @libsql/client with parameterized SQL | All queries parameterized. Migrations run on server start. No ORM -- raw SQL. |
| Express <-> Spotify oEmbed | Server-side HTTP GET (no auth) | Called during post creation only. Response cached. No user credentials involved. |
| Auth Middleware <-> Routes | Middleware chain (`requireAuth`, `optionalAuth`, `requireAdmin`) | Three auth levels: public (no middleware), authenticated contributor, admin. |
| Express Static <-> React Build | `express.static('client/dist')` with SPA fallback | All non-API, non-bot requests serve `index.html` for client-side routing. |

## Database Schema (Recommended)

```sql
-- Core content
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  body TEXT NOT NULL,              -- plain text, 800 char soft limit
  author_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Music embeds (one per post, optionally none)
CREATE TABLE post_embeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER UNIQUE NOT NULL REFERENCES posts(id),
  provider TEXT NOT NULL,          -- 'spotify' or 'apple'
  embed_type TEXT NOT NULL,        -- 'track', 'album', 'playlist', 'artist'
  embed_url TEXT NOT NULL,         -- the iframe src URL
  original_url TEXT NOT NULL,      -- the URL the contributor pasted
  title TEXT,                      -- from oEmbed or parsed
  thumbnail_url TEXT,              -- album art from oEmbed
  UNIQUE(post_id)
);

-- Tags (many-to-many)
CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag TEXT NOT NULL,               -- lowercase, sanitized
  PRIMARY KEY (post_id, tag)
);

-- Social interactions
CREATE TABLE post_likes (
  user_id INTEGER NOT NULL REFERENCES users(id),
  post_id INTEGER NOT NULL REFERENCES posts(id),
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Users and access control
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'contributor',  -- 'admin' or 'contributor'
  bio TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  invite_token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'contributor',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  claimed_at TEXT,
  claimed_by_user_id INTEGER REFERENCES users(id)
);

-- Indexes for feed performance
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_post_tags_tag ON post_tags(tag);
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_comments_post ON post_comments(post_id);
```

## Build Order Implications

The architecture has clear dependency chains that dictate implementation order:

1. **Database schema + Express skeleton + Auth** (foundation) -- Everything depends on the database and auth. The invite system is the gate to all write operations.

2. **Post CRUD + Embed parsing** (core content) -- The central feature. Depends on auth (contributors must be authenticated) and database (posts table). Embed parsing is integral to post creation, not a separate phase.

3. **Feed + Browse routes** (read path) -- Depends on posts existing in the database. This is where pagination, tag filtering, and artist browsing live.

4. **React SPA pages + components** (UI) -- Depends on API routes being available. Build Feed page, Post page, CreatePost page, browse pages.

5. **Social features (likes, comments)** -- Depends on posts and users existing. Lower priority than core content loop.

6. **OG meta tags + sharing** -- Depends on posts having embed metadata stored. Builds on the bot-detection pattern from Backyard Marquee.

7. **Polish (infinite scroll, loading states, error handling)** -- Depends on all core features being functional.

**Key insight:** The embed system (Spotify + Apple Music) is not a separate phase. It is deeply integrated into post creation and display. Build it alongside posts, not after.

## Sources

- [Spotify Embeds Documentation](https://developer.spotify.com/documentation/embeds) -- HIGH confidence
- [Spotify oEmbed API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-oembed-api) -- HIGH confidence
- [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api) -- HIGH confidence
- [Apple Music MusicKit Web](https://developer.apple.com/musickit/web/) -- HIGH confidence
- [Apple Music simple iframe embed](https://allthings.how/how-to-embed-apple-music-playlists-albums-and-songs-on-a-webpage/) -- MEDIUM confidence
- [Kit Engineering: Spotify Embeds](https://engineering.kit.com/2022/05/20/spotify-embeds/) -- MEDIUM confidence (real-world implementation reference)
- [Turso FTS5 Support](https://turso.tech/blog/beyond-fts5) -- MEDIUM confidence
- [Cursor-based pagination patterns](https://learnersbucket.com/examples/interview/react-custom-hook-for-infinite-scroll-with-cursor-based-pagination/) -- MEDIUM confidence
- [DOMPurify for XSS prevention](https://github.com/cure53/DOMPurify) -- HIGH confidence
- [OG meta tags for SPAs](https://whatabout.dev/open-graph-facebook-and-client-side-rendering/) -- MEDIUM confidence

---
*Architecture research for: Involuntary Response (music micro-blogging platform)*
*Researched: 2026-02-26*
