# Feature Research

**Domain:** Music micro-blogging / short-form music commentary platform
**Researched:** 2026-02-26
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Post creation with character guidance | Core product. Every blog/micro-blog has a compose flow. ~500-800 char soft limit. | LOW | Rich text not needed -- plain text with line breaks is enough for the format. Hard limit at ~1000 chars to prevent abuse while keeping the "soft 800" feel. |
| Spotify track/album embeds inline | The core value is "the music is right there to listen to." Spotify covers ~60% of streaming users. | MEDIUM | Use Spotify oEmbed API (`open.spotify.com/oembed`) to resolve URLs to iframe embeds. Accepts track, album, artist URLs. Returns HTML iframe + thumbnail. Server-side resolution avoids CORS issues. |
| Apple Music track/album embeds inline | Covers the other major streaming audience. Without it, a significant chunk of readers can't listen inline. | MEDIUM | Apple Music provides simple iframe embeds via `embed.music.apple.com` URLs -- no MusicKit JS or developer token required for basic playback previews. Copy the embed URL format from share links. |
| Reverse-chronological feed | Standard for editorial blogs and micro-blogs. Tumblr, Substack Notes, Bluesky all use this as default. Algorithmic feeds are explicitly out of scope. | LOW | Simple `ORDER BY created_at DESC` with cursor-based pagination. No algorithmic complexity. |
| Browse by artist | Users come to read about music they care about. Artist pages aggregate all posts mentioning that artist. | MEDIUM | Requires a `post_artists` join table linking posts to normalized artist names. Spotify API can provide canonical artist names/IDs during embed resolution. |
| Browse by tag | Standard content organization. Rate Your Music, Album of the Year, Tumblr all rely on tags for discovery. | LOW | Tags table with many-to-many relationship, max 5 per post. Lowercase, trimmed. Same pattern as Backyard Marquee's `lineup_tags`. |
| Likes on posts | Minimal engagement signal. Every social content platform has this. Tumblr hearts, Twitter likes, Substack likes. | LOW | One like per user per post, toggle on/off. UNIQUE constraint on (user_id, post_id). Display count. Same pattern as Backyard Marquee. |
| Comments on posts | Expected for any community-oriented content platform. Substack, Tumblr, Album of the Year all have comments. | MEDIUM | Flat comments (not threaded) to match the minimal ethos. Basic moderation: contributor can delete comments on their posts, admin can delete any. |
| Share posts (permalink + social) | Users need to be able to copy a link and share a post externally. This is how content spreads. | LOW | Each post gets a clean permalink URL (e.g., `/post/[slug]` or `/post/[id]`). Copy-to-clipboard button. OG meta tags for rich social previews (title, excerpt, artist image). |
| Contributor profiles | Multi-author platform needs identity. Readers want to follow a specific voice. Substack, Tumblr, Medium all center author identity. | LOW | Username, display name, optional bio (~300 chars), optional avatar. Profile page showing their posts in reverse-chron. |
| Invite-only contributor access | Core constraint from PROJECT.md. Maintains editorial quality. Admin creates accounts or sends invite links. | MEDIUM | Admin dashboard or CLI to generate invite tokens. Token-based registration flow. No open signup for contributors. Public readers don't need accounts for reading. |
| Public read access (no login required) | The content is meant to be read by anyone. Gating reads behind auth kills reach and shareability. | LOW | All post content, feeds, artist pages, and tag pages are publicly accessible. Auth only required for contributor actions (post, edit) and reader engagement (like, comment). |
| Responsive, mobile-friendly layout | Over 60% of blog traffic is mobile. A text-first platform must be readable on phones. | LOW | Tailwind handles this well. Single-column layout with generous whitespace scales naturally. |
| Clean, text-first visual design | The writing IS the product. Cluttered UI undermines the editorial voice. The Marginalian, Wait But Why, and many successful text-first blogs prove minimal design works. | MEDIUM | Large readable type (18-20px body), generous line height (1.6-1.75), max-width content column (~650px), lots of whitespace. Music embeds should feel like natural interruptions in the text, not bolted-on widgets. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Music-reference without embed | Reference a song/album by name without embedding a full player. A lighter-weight mention for when you name-drop without needing inline playback. | LOW | Could be a styled inline element like `@artist - "Song Name"` that links to Spotify/Apple Music but doesn't embed the iframe. Keeps posts lean when full embeds aren't needed. |
| OG meta tags with artist imagery | When a post is shared on social media, the preview card shows the artist image (from Spotify API thumbnail) alongside the post excerpt. Makes shares visually compelling and music-specific. | MEDIUM | Server-rendered OG tags per post (same pattern as Backyard Marquee). Pull `og:image` from the primary embedded track/album artwork. Falls back to site default image if no embed. |
| Curated editorial voice (invite-only as feature) | Unlike Rate Your Music (anyone can review) or Substack (anyone can publish), the invite-only model means every contributor is hand-picked. The constraint IS the brand -- quality over volume. | LOW | Not a technical feature, but a product feature. The invite system enables it. Marketing/positioning rather than code. |
| Reading time / post length indicator | Signals the "short-form" nature. Reinforces that this isn't longform criticism. Readers know every post is a quick read. | LOW | Calculate from character count. At 500-800 chars, every post is a ~1 min read. Could display as "Quick take" or "1 min read" badge. |
| Artist detail pages with aggregated takes | A page for each artist showing all posts that mention them, with total post count and contributor count. Becomes a living, growing collection of takes on an artist. | MEDIUM | Beyond basic "browse by artist" filtering. A dedicated `/artist/[name]` page with stats (number of takes, number of contributors who've written about them). Similar to Backyard Marquee's `/stats/artist/:name`. |
| RSS feed | Power users and music nerds (the target audience) are disproportionately RSS users. Substack and every serious blog offers RSS. Drives repeat readership without relying on social algorithms. | LOW | Generate RSS/Atom XML from the posts table. Standard libraries exist (like `feed` npm package). Include post excerpt + link to full post with embed. |
| Post slugs from content | Human-readable URLs derived from the first few words or a manual slug. `/post/radiohead-ok-computer-still-hits` reads better than `/post/a7f3b2`. | LOW | Auto-generate from post content (first ~5 words, slugified) with option for contributor to override. Ensure uniqueness with suffix if collision. |
| Dark mode | Text-heavy reading platforms benefit from dark mode. Music nerds reading at night. Aligns with the aesthetic. | LOW | Tailwind `dark:` classes. System preference detection + manual toggle. Store preference in localStorage. Same pattern as Backyard Marquee's ThemeContext. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Star ratings / numerical scores | Music review platforms (RYM, Album of the Year) center on ratings. Feels like an obvious addition. | Reduces nuanced takes to a number. Encourages score comparison instead of reading. Undermines the "writing is the product" ethos. Letterboxd's best reviews aren't about the star count. | No ratings. The words are the review. If a post is good, people like it and share it. |
| Algorithmic / trending feed | "Show me the best stuff" is a reasonable user request. | Adds significant complexity (what signals? engagement? recency? contributor reputation?). Creates perverse incentives for contributors to write for the algorithm. Chronological is the stated constraint. | Keep reverse-chron. Let browse-by-tag and artist pages serve as curated entry points. A simple "most liked this week" page is fine later if needed. |
| Rich text editor / markdown | "Let me format my posts with bold, italics, headers, links." | Complexity creep. The format is a paragraph, not an essay. Rich formatting encourages longer, more structured posts -- the opposite of the product's ethos. Every formatting option is a decision that slows down writing. | Plain text with line breaks. Maybe allow a single inline link. The constraint forces punchy writing. |
| Threaded / nested comments | "Let me reply to a specific comment." | Threads create sub-conversations that fragment discussion. On short-form posts (~500-800 chars), threaded comments would often be longer than the post itself. Adds significant UI and data complexity. | Flat comments only. Keep discussion simple and focused. Comments are reactions to the post, not conversations with each other. |
| User-uploaded images in posts | "Let me add photos to my posts." | Image hosting is expensive and complex (storage, CDN, moderation, resizing). Pulls focus from text-first design. Opens the door to memes and low-effort content. | Music embeds provide the visual element (album art). If a contributor needs to reference visual art, they can link to it. |
| Notifications system | "Tell me when someone likes or comments on my post." | Real-time notifications add significant infrastructure (WebSockets or polling, notification storage, read/unread state, email integration). Overkill for a small invite-only contributor pool. | Contributors can check their profile page for recent activity. Email notifications can be a v2 feature if the contributor count grows. |
| YouTube / video embeds | "Let me embed music videos too." | Explicitly out of scope per PROJECT.md. YouTube embeds are heavy (large iframes, autoplay concerns, different aspect ratio). Muddies the audio-first identity. | Spotify + Apple Music only for v1. If a contributor wants to reference a video, link to it. |
| Open registration | "Let anyone sign up and post." | Destroys the curated editorial voice that IS the product's identity. Quality control becomes impossible. Spam and low-effort content flood in. | Invite-only forever, or at least until there's a clear editorial process for vetting new contributors. Public readers can engage via likes/comments without contributor access. |
| Full-text search | "Let me search across all posts." | SQLite/Turso FTS setup has quirks. Premature optimization for a small content volume. With curated content from a few contributors, browse-by-artist and tags are sufficient discovery mechanisms. | Tag and artist browsing covers most discovery needs. Add search when post volume makes browsing insufficient (100+ posts). |
| Follower / following system | Social platforms have follow graphs. | Adds significant complexity (follow table, follower counts, "posts from people I follow" feed). With invite-only contributors (likely <20 people), following is meaningless -- readers will read everything anyway. | Contributor profile pages serve the same purpose. Readers can bookmark profiles they care about. |

## Feature Dependencies

```
[Contributor Auth (invite system)]
    |-- requires --> [Admin invite token generation]
    |-- enables --> [Post creation]
                        |-- enables --> [Spotify embeds]
                        |-- enables --> [Apple Music embeds]
                        |-- enables --> [Music references (non-embed)]
                        |-- enables --> [Tags on posts]
                        |                   |-- enables --> [Browse by tag]
                        |-- enables --> [Artist linking on posts]
                                            |-- enables --> [Browse by artist]
                                            |-- enables --> [Artist detail pages]

[Public read access]
    |-- enables --> [Reverse-chron feed]
    |-- enables --> [Post permalink pages]
    |                   |-- enables --> [OG meta tags / social sharing]
    |-- enables --> [RSS feed]

[Reader accounts (optional)]
    |-- enables --> [Likes]
    |-- enables --> [Comments]
                        |-- requires --> [Comment moderation (by contributor + admin)]

[Contributor profiles]
    |-- enhances --> [Post attribution in feed]
    |-- enhances --> [Browse by contributor]
```

### Dependency Notes

- **Post creation requires invite auth:** The entire contributor flow depends on the invite system being in place first. Without auth, no one can post.
- **Embeds enhance post creation:** Posts work without embeds (just text), but embeds are the core value prop. Build embed support alongside or immediately after basic post creation.
- **Artist linking requires embed resolution:** If you're resolving Spotify URLs to embeds, you already have the artist name. Store it in a join table during post creation for browsing later.
- **Reader accounts are optional for reading:** Likes and comments require some form of reader identity, but all content is publicly readable without login. Could use lightweight auth (email-only, no password) or defer reader accounts entirely for v1.
- **OG meta tags require post permalinks:** Server-rendered meta tags need a stable URL per post. Build permalinks into the post model from day one.
- **RSS feed is independent:** Can be added at any point -- it just reads from the posts table. Low dependency, low complexity, high value for the target audience.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept.

- [ ] **Invite-only contributor auth** -- Admin generates invite links, contributors register with token
- [ ] **Post creation with character guidance** -- Plain text, ~500-800 char soft limit, up to ~1000 hard
- [ ] **Spotify embed support** -- Paste a Spotify URL, server resolves via oEmbed, renders inline player
- [ ] **Apple Music embed support** -- Paste an Apple Music URL, renders iframe embed for preview playback
- [ ] **Reverse-chronological feed** -- Main page shows all posts newest-first with pagination
- [ ] **Tags on posts** -- Up to 5 tags per post, browse-by-tag pages
- [ ] **Artist linking** -- Posts linked to artists (extracted from embeds), browse-by-artist pages
- [ ] **Contributor profiles** -- Username, display name, bio, avatar, profile page with their posts
- [ ] **Post permalinks with OG meta tags** -- Clean URLs, rich social previews with artist artwork
- [ ] **Public read access** -- Everything readable without login
- [ ] **Minimal text-first design** -- Large type, whitespace, single column, responsive

### Add After Validation (v1.x)

Features to add once core is working and contributors are posting.

- [ ] **Likes** -- Add when reader engagement data is wanted. Requires lightweight reader accounts (email-only or social login).
- [ ] **Comments** -- Add when contributors want reader feedback. Requires reader accounts + basic moderation.
- [ ] **Dark mode** -- Add when contributors or readers request it. Low effort with Tailwind.
- [ ] **RSS feed** -- Add when there's enough content to warrant subscription. Could be week 2.
- [ ] **Music references (non-embed)** -- Add when contributors want to name-drop without embedding. Styled inline links.
- [ ] **Artist detail pages** -- Add when enough posts exist to make aggregation meaningful (~20+ posts mentioning same artist).

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Reading time badge** -- Nice polish, not essential
- [ ] **"Most liked this week" page** -- Only useful once likes exist and volume warrants it
- [ ] **Email notifications** -- Only if contributor count grows beyond ~10
- [ ] **Full-text search** -- Only when post volume makes browse insufficient
- [ ] **Contributor-to-contributor mentions** -- Only if a conversational dynamic emerges
- [ ] **Share counts / analytics for contributors** -- Only if contributors want performance data

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Post creation (plain text, char limit) | HIGH | LOW | P1 |
| Spotify embed | HIGH | MEDIUM | P1 |
| Apple Music embed | HIGH | MEDIUM | P1 |
| Reverse-chron feed | HIGH | LOW | P1 |
| Invite-only auth | HIGH | MEDIUM | P1 |
| Contributor profiles | HIGH | LOW | P1 |
| Post permalinks + OG meta | HIGH | MEDIUM | P1 |
| Tags + browse-by-tag | MEDIUM | LOW | P1 |
| Artist linking + browse-by-artist | MEDIUM | MEDIUM | P1 |
| Public read (no auth to read) | HIGH | LOW | P1 |
| Text-first responsive design | HIGH | MEDIUM | P1 |
| Likes | MEDIUM | LOW | P2 |
| Comments + moderation | MEDIUM | MEDIUM | P2 |
| Dark mode | MEDIUM | LOW | P2 |
| RSS feed | MEDIUM | LOW | P2 |
| Music references (non-embed) | LOW | LOW | P2 |
| Artist detail pages (stats) | MEDIUM | MEDIUM | P2 |
| Post slugs (human-readable URLs) | LOW | LOW | P2 |
| Full-text search | LOW | MEDIUM | P3 |
| Email notifications | LOW | HIGH | P3 |
| Most-liked page | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Rate Your Music | Album of the Year | Musotic | Substack (music) | Tumblr (music) | Our Approach |
|---------|----------------|-------------------|---------|-------------------|----------------|--------------|
| Post length | Unlimited reviews | Unlimited reviews | Unlimited reviews | Newsletter-length | Unlimited | ~500-800 chars. The constraint IS the format. |
| Ratings / scores | 0.5-5 stars central | User scores + critic scores | Star ratings | None (text only) | None | None. Words only. |
| Music embeds | None (links only) | Links to streaming | Spotify + Apple Music sync | Spotify embed in posts | Spotify/SoundCloud | Spotify + Apple Music inline embeds |
| Who can post | Anyone (1.3M+ users) | Anyone | Anyone | Anyone (paid optional) | Anyone | Invite-only contributors. Quality > quantity. |
| Discovery | Charts, lists, genres | Charts, critic aggregation | Mood, genre, trending | Recommendations, Notes | Tags, reblogs | Tags, artists, chronological feed |
| Social features | Lists, ratings, forums | User ratings, comments | Follow, DM, comments | Likes, comments, Notes | Reblogs, likes, asks | Likes, flat comments |
| Visual design | Dense, data-heavy | Dense, scores everywhere | App-native, colorful | Newsletter format | Theme-dependent | Minimal, text-first, lots of whitespace |
| Identity model | Pseudonymous users | Pseudonymous users | App profiles | Named authors | Pseudonymous blogs | Named contributors (real or pen name) |

### Key Competitive Insight

The gap in the market is not "another place to review music." RYM, AOTY, and Musotic all do that. The gap is a **curated, short-form, text-first** platform where the constraint on length and contributor access creates quality by design. The closest analog is a group blog or zine -- not a social network. Think "The Ringer but for 500-character music takes by 10 people you trust" rather than "Letterboxd for music."

## Sources

- [Spotify oEmbed API Documentation](https://developer.spotify.com/documentation/embeds/reference/oembed) -- HIGH confidence, official docs
- [Spotify Embeds Overview](https://developer.spotify.com/documentation/embeds) -- HIGH confidence, official docs
- [Apple Music Embed Guide](https://dev.to/braydoncoyer/display-an-apple-music-playlist-on-your-website-4n5k) -- MEDIUM confidence, developer tutorial
- [Apple Music MusicKit JS](https://developer.apple.com/documentation/musickitjs) -- HIGH confidence, official Apple docs
- [Rate Your Music - Wikipedia](https://en.wikipedia.org/wiki/Rate_Your_Music) -- MEDIUM confidence, Wikipedia
- [Musotic Launch Announcement](https://news.musotic.com/posts/letterboxd-for-music-is-here) -- MEDIUM confidence, official product site
- [Substack Music Newsletters](https://substack.com/top/music) -- MEDIUM confidence, platform listing
- [Tumblr Music Community](https://www.tumblr.com/music) -- MEDIUM confidence, platform page
- [Open Graph Protocol Best Practices](https://www.semrush.com/blog/open-graph/) -- MEDIUM confidence, industry source
- [Minimal Blog Design Examples](https://www.marketermilk.com/blog/best-blog-designs) -- LOW confidence, roundup article

---
*Feature research for: Music micro-blogging / short-form music commentary platform*
*Researched: 2026-02-26*
