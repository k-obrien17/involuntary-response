# Involuntary Response

## What This Is

A curated music micro-blogging platform where invite-only contributors write short-form takes on songs, albums, and artists with inline Spotify and Apple Music embeds. Readers can sign up, like posts, and leave comments. Contributors save drafts, preview before publishing, and edit published posts. Text-first design — minimal chrome, large type, the writing carries the experience.

## Core Value

Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## Requirements

### Validated

- ✓ Contributors can post short-form music takes (~800 char soft limit) — v1.0
- ✓ Posts embed Spotify or Apple Music players inline — v1.0
- ✓ Main feed shows posts in reverse chronological order — v1.0
- ✓ Posts are browsable by artist or tag — v1.0
- ✓ Invite-only contributor access with admin invite management — v1.0
- ✓ Multiple contributors post under their own identity with profiles — v1.0
- ✓ Minimal, clean, text-first visual design with whitespace — v1.0
- ✓ Clean permalink URLs with social sharing previews — v1.0
- ✓ RSS feed for subscribers — v1.0
- ✓ Dark mode with system preference detection — v1.0
- ✓ Every post has an artist — auto-extracted from embed or manually entered — v2.0
- ✓ Browse-by-artist works for all posts, not just Spotify-embedded ones — v2.0
- ✓ Contributors have avatars on posts and profile pages — v2.0
- ✓ Full-text search across post content, artist names, tags, and contributors — v2.0
- ✓ Posts can reference a song/album without embedding (styled inline link) — v2.0
- ✓ Vercel deployment fully wired (vercel.json API proxy to Render backend) — v2.0

- ✓ Lightweight reader accounts (email + display name signup) — v2.1
- ✓ Readers can like posts (one per reader per post) — v2.1
- ✓ Readers can comment on posts (top-level only, flat) — v2.1
- ✓ Contributors can save posts as drafts and preview before publishing — v2.1
- ✓ Contributors can edit published posts (content, embeds, tags) — v2.1
- ✓ Edited posts show "edited" indicator — v2.1

### Active

- Production deployment wiring (Render URL, env var validation, admin seed) — v3.0
- Dynamic OG meta tags for social sharing previews — v3.0
- 404 page, robots.txt, sitemap for SEO — v3.0
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options) — v3.0
- JWT expiry reduction and CSRF protection — v3.0
- Single-post N+1 query fix and profile pagination — v3.0
- Error state UI for Search/Explore pages — v3.0
- Email/SMTP validation for password reset — v3.0

### Deferred

- Contributors can schedule posts for future publish dates (deferred from v2.1)

### Out of Scope

- Open registration — invite-only maintains editorial voice (readers register separately at /join)
- Mobile app — web-first, responsive design works well
- Algorithmic feed — chronological only, no engagement gaming
- YouTube/video embeds — audio-first identity
- Long-form content — the format is brevity
- Star ratings / numerical scores — undermines nuanced takes
- Threaded comments — flat comments match short-form posts
- Comment editing — delete and re-post; comments are ephemeral reactions
- Email notifications — contributor pool is small enough to check dashboard

## Context

**Shipped v2.1 Reader Engagement & Editorial** (2026-03-01): ~15,000 LOC across React 18 + Express 5 + Turso.
- 56 files modified in v2.1 (+6,712 lines)
- 5 DB migrations (schema init + post_artists + status/published_at + post_likes + post_comments)
- Reader accounts: separate /register-reader endpoint, /join page, role-aware UI
- Engagement: like toggle with optimistic UI, flat comments with three-way moderation
- Editorial: draft save/preview/publish workflow, post editing with "edited" indicator, My Posts dashboard
- Shared helpers: batchLoadPostData prevents N+1 across all 6 post-list endpoints
- Status filtering: `AND p.status = 'published'` on all 14 public query sites

**Known issue:** Spotify artist auto-extraction requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `server/.env`. Apple Music extraction (iTunes Search API) works without credentials.

## Constraints

- **Tech stack**: React 18 / Vite 5 / Tailwind CSS 3 / Express 5 / Turso — proven, no reason to change
- **Auth**: Invite-only for contributors, reader self-registration at /join, public read access for everyone
- **Content length**: ~800 characters per post — soft limit enforced by UI counter
- **Embeds**: Server-side oEmbed resolution (6 providers supported, Spotify + Apple Music primary)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Same stack as Backyard Marquee | Known quantity, good fit for this type of app | ✓ Good — fast execution, familiar patterns |
| Invite-only contributors | Maintain editorial quality, expand later | ✓ Good — clean auth model, v2 adds reader accounts |
| Paragraph-length posts | Long enough to say something real, short enough to stay punchy | ✓ Good — 800 char soft limit with visual counter |
| Spotify + Apple Music embeds | Cover most listeners without overcomplicating | ✓ Good — oEmbed resolver expanded to 6 providers |
| Minimal text-first design | The writing is the product, not the UI | ✓ Good — prose typography, whitespace, no chrome |
| Server-side oEmbed resolver | Client-side parsing was brittle; server controls validation | ✓ Good — replaced initial client embedParser.js |
| Click-to-load embed facades | Performance in feed; full iframe on permalink | ✓ Good — fast feed, engaging permalinks |
| Composite cursor pagination | Stable ordering across concurrent inserts | ✓ Good — (created_at, id) cursor |
| Vercel serverless for OG tags | Social crawlers don't execute JS | ✓ Good — dynamic previews with album art |
| Profile pages via direct navigation | Slide-out panel was wrong UX (user feedback) | ✓ Good — /u/:username full pages |
| iTunes Search API for Apple Music artists | Public API, no auth required; simpler than Apple Music API | ✓ Good — reliable extraction without developer tokens |
| Auto-extraction priority: Spotify > Apple Music > manual | Most common embed type checked first; manual as fallback | ✓ Good — covers all cases |
| BigInt coercion at db wrapper layer | libsql returns INTEGER as BigInt; fixing at db.get/db.all fixes all queries globally | ✓ Good — eliminated entire class of === comparison bugs |
| Gravatar with d=blank fallback | No onerror handling needed; transparent 1x1 px triggers initials display | ✓ Good — simple, no JS error handling |
| Client-side inline reference parsing | No server changes needed; regex detects music URLs in post body | ✓ Good — RichBody component, zero backend work |
| LIKE-based search over FTS | Simple implementation; LIKE sufficient for current data volume | ⚠️ Revisit — may need FTS5 if data grows significantly |
| Separate /register-reader endpoint | Preserves invite-only contributor flow; readers get different role | ✓ Good — clean separation, no invite token for readers |
| requireContributor middleware | Positive check (contributor OR admin) rather than negative role exclusion | ✓ Good — explicit gate on all mutation routes |
| Check-then-act for like toggle | Avoids Turso INSERT OR IGNORE ambiguity (known issue #2713) | ✓ Good — SELECT then INSERT/DELETE, reliable behavior |
| Optimistic UI for likes/comments | Instant visual feedback, rollback on server error | ✓ Good — responsive UX, matches modern patterns |
| Three-way comment delete auth | Comment author, post author, or admin can delete | ✓ Good — server-enforced, canDelete boolean in response |
| published_at for feed ordering | Drafts use NULL published_at; feed orders by publish time not creation | ✓ Good — drafts don't bury in feed when later published |
| No unpublish | Once published, post cannot revert to draft (protects engagement data) | ✓ Good — simple mental model, 400 rejection on attempt |
| Scheduling deferred to future | Draft workflow ships first; scheduling adds cron complexity | — Pending — revisit in next milestone |

---
*Last updated: 2026-03-01 after v3.0 milestone started*
