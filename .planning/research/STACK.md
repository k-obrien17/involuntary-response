# Stack Research

**Domain:** Music micro-blogging platform with streaming embeds
**Researched:** 2026-02-26
**Confidence:** HIGH (core stack proven, embed APIs verified with official docs)

## Recommended Stack

### Core Technologies (Decided)

These are carried over from Backyard Marquee -- proven, familiar, no reason to change.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 18.x | Frontend UI | Known quantity, team expertise, stable |
| Vite | 5.x | Build tooling | Fast dev server, HMR, production builds. Already in use |
| Tailwind CSS | 3.x | Styling | Utility-first, text-first design is a natural fit. Already in use |
| React Router | 6.x | Client routing | Standard for React SPAs. Already in use |
| Express | 5.x | API server | Minimal, flexible, team expertise |
| Turso (@libsql/client) | latest | Database | Hosted SQLite, existing migration pattern, proven at this scale |
| Axios | latest | HTTP client | Already configured with auth interceptor pattern |

### Music Embed Integration

This is the critical new domain. Two approaches, both verified.

| Library/API | Version | Purpose | Why Recommended |
|-------------|---------|---------|-----------------|
| Spotify oEmbed API | N/A (web API) | Fetch embed HTML for Spotify URLs | **No authentication required.** Endpoint: `GET https://open.spotify.com/oembed?url={url}`. Returns iframe HTML, title, thumbnail. Supports tracks, albums, artists, playlists. Zero dependencies, call from server to avoid CORS |
| Apple Music iframe embeds | N/A (URL format) | Embed Apple Music players | **No API key required.** URL format: `https://embed.music.apple.com/{country}/{type}/{name}/{id}`. Supports songs (`?i={trackId}` on album URL), albums, playlists. Standard iframe with `allow="autoplay *; encrypted-media *;"` |
| Odesli (song.link) API | v1-alpha.1 | Cross-platform music link resolution | Optional but valuable. Endpoint: `GET https://api.song.link/v1-alpha.1/links?url={url}`. Takes a Spotify URL, returns Apple Music equivalent (and vice versa). Free, 10 req/min without API key. Enables "listen on your platform" feature |

**Spotify embed URL format:**
```
https://open.spotify.com/embed/track/{TRACK_ID}
https://open.spotify.com/embed/album/{ALBUM_ID}
```

**Spotify embed heights:**
- `80px` -- compact/minimal single track player
- `152px` -- standard single track/episode player
- `352px` -- album/playlist player with track list

**Spotify embed parameters:**
- `?theme=0` -- dark theme (default is light/auto)
- Width is typically `100%`, responsive by default

**Apple Music embed URL format:**
```
https://embed.music.apple.com/us/album/{album-name}/{album-id}           (album)
https://embed.music.apple.com/us/album/{album-name}/{album-id}?i={trackId}  (single song)
https://embed.music.apple.com/us/playlist/{name}/{id}                     (playlist)
```

**Apple Music embed heights:**
- `150px` -- single song player (compact)
- `450px` -- album/playlist player

**Confidence: HIGH** -- Both embed approaches verified against official Spotify developer docs and Apple community documentation. No API keys needed for basic embeds. The Spotify oEmbed endpoint is documented at developer.spotify.com/documentation/embeds/reference/oembed.

### Post Content: Markdown Rendering (Not Rich Text Editing)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-markdown | 10.1.0 | Render stored markdown as React components | **Safe by default** -- no dangerouslySetInnerHTML. Converts markdown to AST, then to React elements. 4,840 dependents. ESM only |
| remark-gfm | 4.0.1 | GFM extensions (bold, italic, links, strikethrough) | Adds autolinks, strikethrough, basic formatting. Pairs with react-markdown |
| rehype-sanitize | 6.0.0 | Whitelist-based HTML sanitization | Defense-in-depth: strips any dangerous HTML that might slip through. Use with react-markdown for user-generated content |

**Why markdown over a rich text editor:** For 500-800 character posts, a rich text editor (Tiptap, Lexical, Quill) is overkill. The post creation UI should be a plain `<textarea>` with optional formatting hints (bold with `**`, italic with `*`, links with `[text](url)`). Contributors are music writers, not general public -- they can handle basic markdown. Store as markdown, render with react-markdown. This keeps the writing experience minimal and text-first, matching the product philosophy.

**Why NOT Tiptap/Lexical/Quill:**
- Tiptap (@tiptap/react 3.20.0) is excellent but adds ~50KB+ and complexity for posts that are one paragraph
- Lexical (Meta) is powerful but designed for document editing, not short takes
- Quill has a dated API and unclear maintenance trajectory
- All three introduce content serialization complexity (HTML or JSON document format) when plain markdown is simpler to store, search, and render

**Confidence: HIGH** -- react-markdown is the standard React markdown renderer with 4,840 npm dependents. The "plain textarea + markdown rendering" pattern is well-established for short-form content.

### Post Editor UI

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| react-textarea-autosize | 8.5.9 | Auto-growing textarea | Drop-in `<textarea>` replacement that grows with content. 1,528 dependents. Perfect for variable-length short posts |

The compose experience: a `react-textarea-autosize` textarea (grows as you type, max ~800 chars), a character counter, and a separate field or inline syntax for attaching a music reference (Spotify/Apple Music URL). No toolbar, no formatting buttons. The writing carries the experience.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.1.6 | Generate short unique IDs for posts/slugs | Post URLs, share tokens, invite codes. 118 bytes, secure, URL-friendly |
| slugify | latest | URL-friendly slug generation | Convert post titles or first-N-words to URL slugs for readable post URLs |
| date-fns | 4.1.0 | Date formatting/manipulation | "2 hours ago", "Feb 26, 2026" display. Tree-shakeable, no Moment.js bloat |
| DOMPurify | 3.3.1 | HTML sanitization | Server-side sanitization of any user input that might render as HTML. Belt-and-suspenders with rehype-sanitize |
| express-rate-limit | 8.2.1 | API rate limiting | Per-endpoint rate limits (same pattern as Backyard Marquee). Already familiar |

### Authentication & Authorization

Carry forward the JWT + bcrypt pattern from Backyard Marquee, but simplified:

| Technology | Purpose | Notes |
|------------|---------|-------|
| JWT (jsonwebtoken) | Session tokens | Same pattern as Backyard Marquee |
| bcrypt | Password hashing | Same pattern |
| Invite token system | Contributor access control | Admin generates invite links with nanoid tokens, stored in DB with expiry. Invite consumed on registration |

No Google OAuth needed for v1 (invite-only means you control who gets in). Add later if desired.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite dev server | Frontend dev with HMR | Proxy `/api` to Express backend |
| node --watch | Backend dev with auto-restart | Built into Node.js, no nodemon needed |
| ESLint | Code quality | Standard React config |

## Installation

```bash
# Client
cd client
npm install react-markdown remark-gfm rehype-sanitize
npm install react-textarea-autosize
npm install date-fns nanoid

# Server
cd server
npm install express-rate-limit
npm install nanoid slugify
npm install dompurify  # or handle sanitization with existing patterns
```

Note: React, Vite, Tailwind, React Router, Axios, Express, @libsql/client, jsonwebtoken, bcrypt are all carried from the existing Backyard Marquee stack and don't need to be re-evaluated.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Plain textarea + react-markdown | Tiptap (@tiptap/react 3.20.0) | If you later want inline formatting toolbar, slash commands, or collaborative editing. Overkill for v1 |
| Plain textarea + react-markdown | Lexical (Meta) | If you need a full document editor with complex nodes. Wrong tool for paragraph-length posts |
| Spotify oEmbed API (server-side) | react-spotify-embed (2.1.0, ~1.8K weekly downloads) | Never -- it's a thin wrapper around an iframe. Build your own component in 20 lines |
| Apple Music iframe embeds | MusicKit JS (v3) | Only if you need playback control, library access, or subscriber features. Requires Apple Developer account + API key. Simple embeds don't need it |
| Odesli API | Manual cross-platform linking | If Odesli rate limits (10/min free) become a problem. But for an invite-only blog with modest traffic, 10/min is plenty |
| nanoid | uuid | If you need RFC 4122 compliance. nanoid is shorter, URL-friendly, and sufficient for post IDs |
| date-fns | dayjs | Either works. date-fns is tree-shakeable and slightly more popular. Personal preference |
| Turso (SQLite) | PostgreSQL | If you hit SQLite concurrency limits. Turso handles this well for read-heavy workloads like a blog. Migrate if you reach serious scale |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| MusicKit JS for basic embeds | Requires Apple Developer account, API key generation, JWT token signing, and complex setup -- all for something a plain iframe does for free | Apple Music iframe embed URLs (`embed.music.apple.com`) |
| react-spotify-embed | Tiny wrapper (1.8K downloads/week) with no meaningful abstraction over an iframe. Adds a dependency for something trivial | Build a `<SpotifyEmbed>` component: extract track/album ID from URL, render iframe with correct `src` |
| Draft.js | Archived by Meta (2023). No longer maintained | react-markdown for rendering, plain textarea for editing |
| Quill.js | Aging API, unclear maintenance, heavy for short-form content | react-markdown |
| Moment.js | Massive bundle size, mutable API, in maintenance mode | date-fns 4.x |
| Full MusicKit JS playback SDK | 200KB+ bundle, requires Apple Developer membership, subscriber authentication flow -- massive complexity for embedding a player | iframe embeds via `embed.music.apple.com` |
| Spotify Web Playback SDK | Requires Spotify Premium, OAuth flow, complex setup. You're embedding previews, not building a music player | Spotify oEmbed/iframe embeds |

## Stack Patterns by Feature

**Embedding a Spotify track in a post:**
1. Contributor pastes a Spotify URL (e.g., `https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh`)
2. Server extracts the track ID via regex: `/track\/([a-zA-Z0-9]+)/`
3. Server calls `GET https://open.spotify.com/oembed?url={url}` to get title + thumbnail (cache this)
4. Frontend renders: `<iframe src="https://open.spotify.com/embed/track/{id}" height="152" width="100%" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />`

**Embedding an Apple Music track in a post:**
1. Contributor pastes an Apple Music URL (e.g., `https://music.apple.com/us/album/name/123456?i=789`)
2. Server extracts country, type, album ID, and track ID via regex
3. Frontend renders: `<iframe src="https://embed.music.apple.com/us/album/name/123456?i=789" height="150" width="100%" frameBorder="0" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" allow="autoplay *; encrypted-media *;" />`

**Cross-platform linking (optional, Odesli):**
1. Contributor provides one URL (Spotify or Apple Music)
2. Server calls `GET https://api.song.link/v1-alpha.1/links?url={url}&userCountry=US`
3. Response includes `linksByPlatform.spotify.url` and `linksByPlatform.appleMusic.url`
4. Post displays both platform embed options, reader chooses their preference

**Rendering post content:**
1. Post body stored as plain text with optional markdown formatting
2. Frontend renders: `<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{post.body}</ReactMarkdown>`
3. No custom HTML, no embedded scripts, no XSS surface

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-markdown@10.1.0 | React 18.x, Node 16+ | ESM only. Must use `import`, not `require` |
| remark-gfm@4.0.1 | react-markdown 10.x (remark 15+) | ESM only |
| rehype-sanitize@6.0.0 | react-markdown 10.x (rehype 5+) | ESM only |
| react-textarea-autosize@8.5.9 | React 18.x | CommonJS + ESM |
| nanoid@5.1.6 | Node 18+ | ESM only in v5. Use `nanoid` v3 if CJS needed on server |
| date-fns@4.1.0 | Node 16+ | ESM + CJS via subpath exports |
| express-rate-limit@8.2.1 | Express 5.x | Standard Express middleware |
| DOMPurify@3.3.1 | Node 18+ (via jsdom) or browser | For server-side use, pair with isomorphic-dompurify or use in browser only |

**ESM note:** react-markdown 10.x, remark-gfm 4.x, and rehype-sanitize 6.x are ESM-only. The Vite frontend handles this natively. If the Express server uses CommonJS (`require`), you may need to dynamically `import()` these packages on the server, or handle markdown rendering client-side only (recommended -- the server doesn't need to render markdown).

## Embed Integration Decision Matrix

| Scenario | Approach | Auth Required | Complexity |
|----------|----------|---------------|------------|
| Display Spotify track in post | iframe to `open.spotify.com/embed/track/{id}` | None | Low |
| Get Spotify track metadata (title, thumbnail) | oEmbed API `open.spotify.com/oembed?url={url}` | None | Low |
| Display Apple Music track in post | iframe to `embed.music.apple.com/...` | None | Low |
| Get Apple Music metadata | Apple Music API or scrape from URL | Apple Developer account for API | Medium |
| Cross-platform "also on" links | Odesli API `api.song.link/v1-alpha.1/links` | None (10/min) or API key | Low |
| Full playback control (play/pause/seek) | Spotify iFrame API or MusicKit JS | Spotify: none. Apple: Developer account | High |
| Subscriber-only full track playback | Spotify Web Playback SDK / MusicKit JS | OAuth / Apple Developer | Very High |

**Recommendation:** Stick with the "Low" complexity column for v1. iframe embeds give you inline playback with zero auth complexity. The Odesli API is a nice-to-have for cross-platform links. Everything in the "Medium" to "Very High" rows is scope creep for a micro-blog.

## Sources

- [Spotify oEmbed API Reference](https://developer.spotify.com/documentation/embeds/reference/oembed) -- Endpoint, parameters, response format (HIGH confidence)
- [Spotify Embeds Overview](https://developer.spotify.com/documentation/embeds) -- Embed types, customization options (HIGH confidence)
- [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api) -- Dynamic embed loading, controller methods (HIGH confidence)
- [Apple Music embed format](https://discussions.apple.com/thread/252671168) -- iframe URL structure, no API key required (MEDIUM confidence -- community source, verified with multiple examples)
- [MusicKit on the Web](https://developer.apple.com/musickit/web/) -- Full MusicKit JS SDK documentation (HIGH confidence)
- [Odesli/Songlink API](https://publicapi.dev/songlink-odesli-api) -- Cross-platform link resolution (MEDIUM confidence -- third-party documentation, API is v1-alpha)
- [react-markdown npm](https://www.npmjs.com/package/react-markdown) -- v10.1.0, safe-by-default markdown rendering (HIGH confidence)
- [remark-gfm npm](https://www.npmjs.com/package/remark-gfm) -- v4.0.1, GFM extensions (HIGH confidence)
- [rehype-sanitize npm](https://www.npmjs.com/package/rehype-sanitize) -- v6.0.0, whitelist-based sanitization (HIGH confidence)
- [react-textarea-autosize npm](https://www.npmjs.com/package/react-textarea-autosize) -- v8.5.9, auto-growing textarea (HIGH confidence)
- [Liveblocks Rich Text Editor Comparison 2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025) -- Editor landscape overview (MEDIUM confidence)
- [DOMPurify](https://github.com/cure53/DOMPurify) -- v3.3.1, XSS sanitizer (HIGH confidence)
- [express-rate-limit npm](https://www.npmjs.com/package/express-rate-limit) -- v8.2.1 (HIGH confidence)
- [nanoid npm](https://www.npmjs.com/package/nanoid) -- v5.1.6 (HIGH confidence)
- [date-fns npm](https://www.npmjs.com/package/date-fns) -- v4.1.0 (HIGH confidence)

---
*Stack research for: Involuntary Response -- music micro-blogging platform*
*Researched: 2026-02-26*
