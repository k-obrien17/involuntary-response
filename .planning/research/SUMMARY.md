# Project Research Summary

**Project:** Involuntary Response
**Domain:** Music micro-blogging platform (short-form commentary with streaming embeds)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

Involuntary Response is a curated, invite-only music micro-blogging platform where hand-picked contributors write short-form takes (500-800 characters) about music, with inline Spotify and Apple Music embeds. The product is closer to a group zine than a social network -- the constraint on length and contributor access is the brand, not a limitation. The entire existing Backyard Marquee stack (React 18, Vite 5, Tailwind, Express 5, Turso) carries forward unchanged, and the two genuinely new technical domains -- music embed integration and invite-only auth -- are both well-documented and low-complexity. Spotify and Apple Music both offer free, no-auth iframe embeds that cover the core use case without touching restricted APIs.

The recommended approach is a monolith SPA with server-side OG meta tag injection, the same architecture already proven in Backyard Marquee. The critical new pattern is the embed pipeline: contributors paste a Spotify or Apple Music URL, the client parses it for instant preview, the server re-parses and fetches oEmbed metadata at write time, and the resolved embed data is stored alongside the post as structured data. Post bodies are plain text (no markdown, no rich text editor) stored in a textarea, rendered with react-markdown for minimal formatting. The posting flow should take under 60 seconds.

The top risks are: (1) embed performance killing feed pages when multiple Spotify iframes load simultaneously -- solved by lazy-loading with click-to-play placeholders, decided before any UI is built; (2) content drought on an invite-only platform -- solved by securing 3-5 committed contributors and seeding 20-30 posts before public launch; (3) the temptation to use the Spotify Web API (now heavily restricted as of February 2026) when the free oEmbed/embed approach covers all needs. Every critical pitfall can be avoided by making the right architectural decisions in Phase 1 rather than retrofitting later.

## Key Findings

### Recommended Stack

The stack is deliberately conservative -- nearly everything is carried forward from Backyard Marquee. The only new dependencies are for markdown rendering and embed display. See [STACK.md](STACK.md) for full details.

**Core technologies (carried forward):**
- **React 18 + Vite 5 + Tailwind 3** -- Frontend stack, proven, no reason to change
- **Express 5 + Node.js** -- API server, familiar patterns for auth, routing, middleware
- **Turso (@libsql/client)** -- Hosted SQLite, existing migration pattern, handles read-heavy workloads well

**New dependencies:**
- **react-markdown 10.x + remark-gfm + rehype-sanitize** -- Safe-by-default markdown rendering for post bodies. ESM only, handled natively by Vite
- **react-textarea-autosize** -- Auto-growing textarea for the compose experience. Drop-in replacement
- **Spotify oEmbed API** -- No auth required. Server-side GET to fetch embed metadata (title, thumbnail, iframe HTML)
- **Apple Music iframe embeds** -- No API key required. URL-format construction from parsed contributor links
- **nanoid + date-fns** -- Short unique IDs for slugs/tokens, tree-shakeable date formatting
- **Odesli (song.link) API** -- Optional cross-platform link resolution, 10 req/min free tier

**Critical version note:** react-markdown 10.x, remark-gfm 4.x, and rehype-sanitize 6.x are ESM-only. This is fine for the Vite frontend. The Express server (CommonJS) should not render markdown -- keep markdown rendering client-side only.

### Expected Features

See [FEATURES.md](FEATURES.md) for the full prioritization matrix and competitor analysis.

**Must have (table stakes -- P1):**
- Invite-only contributor auth with admin-generated invite tokens
- Post creation: plain text, ~800 char soft limit, ~1000 hard limit
- Spotify embed support (paste URL, resolve via oEmbed, render inline player)
- Apple Music embed support (paste URL, construct iframe embed URL)
- Reverse-chronological feed with cursor-based pagination
- Tags on posts (up to 5, browse-by-tag pages)
- Artist linking (extracted from embeds, browse-by-artist pages)
- Contributor profiles (username, display name, bio, their posts)
- Post permalinks with OG meta tags (rich social previews with album art)
- Public read access (no login required to read anything)
- Minimal text-first responsive design (large type, whitespace, single column)

**Should have (differentiators -- P2):**
- Likes (requires lightweight reader accounts)
- Comments with flat threading and basic moderation
- Dark mode (Tailwind dark: classes, system preference detection)
- RSS feed (high value for the music-nerd target audience)
- Music references without embed (styled inline link, no iframe)
- Artist detail pages with aggregated stats

**Defer (v2+):**
- Full-text search (premature for low post volume)
- Email notifications (unnecessary for <10 contributors)
- "Most liked" pages, share analytics, contributor mentions

**Anti-features (explicitly avoid):**
- Star ratings or numerical scores (undermines "words are the review" ethos)
- Rich text editor (overkill for paragraph-length posts; complexity creep)
- Algorithmic/trending feed (perverse incentives, chronological is the constraint)
- Threaded comments (fragments discussion on short posts)
- User-uploaded images (expensive, pulls focus from text)
- Open registration (destroys curatorial identity)
- YouTube/video embeds (out of scope, audio-first identity)

### Architecture Approach

Standard React SPA + Express API monolith with Turso, the same pattern as Backyard Marquee. The Express server operates in dual mode: API routes for the SPA, and bot-detected HTML responses with OG meta tags for social crawlers. Three auth levels -- public (no middleware), contributor (JWT), admin (JWT + role check) -- gate all write operations behind the invite system. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system diagram and recommended project structure.

**Major components:**
1. **React SPA** -- Feed, Post, Browse (artist/tag), CreatePost, Profile, AcceptInvite pages. PostCard and MusicEmbed as core reusable components
2. **Express API** -- Routes split by auth level: `browse.js` (public reads), `posts.js` (contributor CRUD), `embeds.js` (Spotify oEmbed proxy), `admin.js` (invite management)
3. **Embed Pipeline** -- `embedParser.js` utility shared between client (instant preview) and server (source-of-truth resolution). Stores structured data (provider, type, ID, embed URL, metadata) not raw HTML
4. **Turso Database** -- 7 tables: `posts`, `post_embeds`, `post_tags`, `post_likes`, `post_comments`, `users`, `invites`. Indexes on `created_at`, `tag`, and foreign keys for feed performance
5. **OG Meta Handler** -- Bot user-agent detection in Express, serves post-specific meta tags (title, excerpt, album art thumbnail) for social sharing

### Critical Pitfalls

See [PITFALLS.md](PITFALLS.md) for the full pitfall-to-phase mapping and recovery strategies.

1. **Embed performance death on feed pages** -- 15 Spotify iframes = 5-8 MB payload, layout shifts, frozen scrolling. Solve with click-to-load placeholders (album art thumbnail + play button); never render iframes eagerly in a feed. Decide this in Phase 1 before any UI exists.

2. **Apple Music country code lock-in** -- Embed URLs contain a hardcoded storefront (`/us/`, `/gb/`). Non-matching readers get "not available in your country." Normalize away the country code at write time, default to `us` storefront (broadest catalog), show fallback link for failed embeds.

3. **Spotify Web API vs. Embed confusion** -- The Web API is now heavily restricted (Feb 2026: Premium required, 5-user limit, 1 Client ID per dev). The oEmbed API and iframe embeds require zero auth. Design the posting flow around URL pasting, not artist search, to avoid the Web API entirely.

4. **SPA without server-side OG tags kills social sharing** -- Social crawlers don't execute JavaScript. Without server-side meta tag injection, shared links show nothing. Implement bot detection + dynamic meta tags in Express, same pattern as Backyard Marquee.

5. **Content drought on invite-only platform** -- The biggest non-technical risk. Secure 3-5 committed contributors before building. Seed 20-30 posts before public launch. Make posting take <60 seconds.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Database, Auth, Post CRUD with Embeds)

**Rationale:** Everything depends on the database schema, invite-only auth, and the post creation pipeline. The embed system is inseparable from post creation -- it is not a separate phase. The data model decisions made here (structured embed data, cursor-based pagination, role column) prevent the costliest pitfalls.

**Delivers:** A working backend where an admin can generate invites, contributors can register and create posts with Spotify/Apple Music embeds, and posts are stored with structured embed metadata. No frontend yet.

**Addresses:** Invite-only auth, post creation, Spotify embeds, Apple Music embeds, artist linking (extracted from embeds), tags on posts

**Avoids:** Storing raw embed HTML (store structured data instead), offset pagination (cursor from day one), Spotify Web API dependency (oEmbed only), Apple Music country code lock-in (normalize at write time), missing server-side validation (enforce char limits in API)

### Phase 2: Public Reading Experience (Feed, Post Pages, Browse, OG Tags)

**Rationale:** With content storable via API, the next priority is making it readable. The feed is the core read path and must be performant with multiple embeds. OG meta tags enable social sharing -- the primary distribution mechanism. Browse-by-artist and browse-by-tag are table-stakes discovery features.

**Delivers:** A fully functional public-facing site: chronological feed with lazy-loaded embeds, individual post pages with OG meta tags, browse-by-artist pages, browse-by-tag pages, contributor profile pages. The site is publicly readable with no login required.

**Addresses:** Reverse-chronological feed, post permalinks, OG meta tags, browse by artist, browse by tag, contributor profiles, public read access, text-first responsive design

**Avoids:** Embed performance death (click-to-load placeholders from the start), SPA without OG tags (bot detection in Express), embed iframes overflowing on mobile (responsive container component)

### Phase 3: Contributor Experience (Create Post UI, Edit, Dashboard)

**Rationale:** With the read path complete, build the write path UI. The compose experience must be fast and frictionless -- paste a link, write a take, publish. The contributor dashboard provides gentle accountability (days since last post).

**Delivers:** Full contributor workflow: create post page with embed preview, edit posts, view own posts, simple contributor dashboard. The posting flow takes under 60 seconds.

**Addresses:** Post creation UI (react-textarea-autosize), embed input with instant preview, contributor dashboard, post editing

**Avoids:** Rich text editor complexity (plain textarea + character counter), posting flow taking >3 steps (paste link, write, publish)

### Phase 4: Social Features (Likes, Comments, Reader Engagement)

**Rationale:** Social features depend on posts and readers existing. They are P2 features -- valuable but not launch-blocking. Likes require lightweight reader accounts. Comments require moderation. Build after the core content loop is proven.

**Delivers:** Like/unlike on posts, flat comments with contributor + admin moderation, lightweight reader accounts (for engagement only, not posting).

**Addresses:** Likes, comments, comment moderation, reader accounts

**Avoids:** Threaded comments (flat only), comments overshadowing posts (collapsed by default), missing comment length limits

### Phase 5: Polish and Distribution (RSS, Dark Mode, Sharing, Content Seeding)

**Rationale:** With all core features functional, add distribution and polish features. RSS is high-value for the target audience. Dark mode is easy with Tailwind. Content seeding happens here or earlier, but must be complete before public launch.

**Delivers:** RSS feed, dark mode toggle, share/copy-link button, human-readable post slugs, 20-30 seeded posts, public launch readiness.

**Addresses:** RSS feed, dark mode, share posts, post slugs, content seeding

**Avoids:** Launching with empty content (seed before sharing URL)

### Phase Ordering Rationale

- **Phase 1 before everything:** The database schema, auth model, and embed pipeline are the foundation. Every pitfall rated "Phase 1" in the research (6 of 11 pitfalls) must be addressed here. Getting the data model wrong requires painful migrations later.
- **Phase 2 before Phase 3:** Build the read path before the write path UI. This lets you test data display, pagination, and embed rendering with seed data before the compose UI exists. It also ensures OG tags work before any content is shared publicly.
- **Phase 3 before Phase 4:** The contributor posting experience must be excellent before adding engagement features. If posting is clunky, contributors won't use it, and likes/comments on zero content are meaningless.
- **Phase 4 is independent of Phase 5:** Social features and polish/distribution can be built in parallel or in either order. They are separated because they have different dependency profiles.
- **Embeds are NOT a separate phase:** Research unanimously confirms that embed parsing, storage, and rendering are integral to post creation and display. They must be built into Phases 1-3, not bolted on afterward.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** The embed URL parsing regex for both Spotify and Apple Music needs thorough testing with edge cases (playlists, artist pages, regional Apple Music URLs, v2 embed URLs). Architecture research provides starter regex but production use demands more coverage.
- **Phase 2:** Lazy-loading embed strategy (Intersection Observer vs. Spotify iFrame API vs. click-to-load) needs a proof-of-concept before committing. The Spotify community reports that `loading="lazy"` on iframes can break embed interaction.

Phases with standard patterns (skip research-phase):
- **Phase 3:** Post creation UI with textarea + character counter is a well-established pattern. No novel complexity.
- **Phase 4:** Likes and comments are identical to the Backyard Marquee implementation. Direct port.
- **Phase 5:** RSS generation, dark mode, and share buttons are all thoroughly documented patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack is proven (carried from Backyard Marquee). New dependencies verified against official docs and npm. Embed APIs confirmed auth-free. |
| Features | MEDIUM-HIGH | Feature landscape well-researched with competitor analysis (RYM, AOTY, Musotic, Substack, Tumblr). Anti-features list is opinionated but aligned with product philosophy. Reader account strategy for likes/comments needs finalization. |
| Architecture | HIGH | Architecture mirrors Backyard Marquee with targeted additions. Database schema, project structure, and data flows all documented with code examples. Embed pipeline pattern verified against Spotify official docs. |
| Pitfalls | HIGH | Embed performance and Apple Music regionalization pitfalls verified against Spotify developer docs and community reports. Spotify Feb 2026 API restrictions confirmed via official migration guide. Content drought risk is real but non-technical. |

**Overall confidence:** HIGH

### Gaps to Address

- **Reader account model:** Research identifies that likes and comments require reader identity but does not fully specify the reader auth flow. Options: email-only (no password), social login, or anonymous with cookie-based identity. Decide during Phase 4 planning.
- **Apple Music metadata fetching:** Spotify oEmbed returns title and thumbnail for free. Apple Music has no equivalent free metadata API -- you get the embed URL but not the track title or artwork without either the Apple Music API (requires developer account) or scraping. Decide whether to require contributors to manually enter the song/artist name for Apple Music embeds, or invest in Apple Developer account for metadata.
- **Odesli API reliability:** The cross-platform link resolution API is v1-alpha and rate-limited to 10 req/min without a key. Fine for invite-only volume, but its long-term availability is uncertain. Treat as nice-to-have, not load-bearing.
- **Content moderation scope:** With invite-only contributors, moderation is mainly about comments from readers. Research identifies flat comments with contributor/admin delete capability, but does not address spam prevention for unauthenticated or lightly-authenticated readers. Address during Phase 4 planning.

## Sources

### Primary (HIGH confidence)
- [Spotify oEmbed API Reference](https://developer.spotify.com/documentation/embeds/reference/oembed) -- Embed endpoint, no auth required
- [Spotify Embeds Overview](https://developer.spotify.com/documentation/embeds) -- Embed types, iframe parameters, customization
- [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api) -- Programmatic embed control for lazy loading
- [Spotify February 2026 Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) -- Web API restrictions (Premium required, 5-user limit)
- [Apple MusicKit Web](https://developer.apple.com/musickit/web/) -- Full SDK docs (confirmed overkill for basic embeds)
- [react-markdown npm](https://www.npmjs.com/package/react-markdown) -- v10.1.0, safe-by-default rendering
- [DOMPurify](https://github.com/cure53/DOMPurify) -- v3.3.1, XSS sanitization

### Secondary (MEDIUM confidence)
- [Apple Music embed format](https://discussions.apple.com/thread/252671168) -- iframe URL structure, community-verified
- [Odesli/Songlink API](https://publicapi.dev/songlink-odesli-api) -- Cross-platform link resolution, v1-alpha
- [Spotify Community: loading=lazy breaks embed](https://community.spotify.com/t5/Spotify-for-Developers/loading-lazy-breaks-embed-iframe/td-p/5166267) -- Critical lazy-loading caveat
- [Spotify Community: oEmbed v2 URL problems](https://community.spotify.com/t5/Other-Podcasts-Partners-etc/Oembed-problems/td-p/5217628) -- Edge case with playlist-v2 URLs
- [Cursor-based pagination patterns](https://learnersbucket.com/examples/interview/react-custom-hook-for-infinite-scroll-with-cursor-based-pagination/) -- Implementation reference
- [Liveblocks Rich Text Editor Comparison 2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025) -- Confirmed rich text editors are overkill for this use case

### Tertiary (LOW confidence)
- [DMCA Compliance Checklist 2025](https://patentpc.com/blog/the-complete-dmca-compliance-checklist-for-online-platforms-in-2025) -- Not directly verified, may be relevant for music content platform
- [Minimal Blog Design Examples](https://www.marketermilk.com/blog/best-blog-designs) -- Design inspiration, roundup article

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
