# Involuntary Response

## What This Is

A curated music micro-blogging platform where invite-only contributors write short-form takes on songs, albums, and artists with inline Spotify and Apple Music embeds. Readers can sign up, like posts, and leave comments. Contributors save drafts, preview before publishing, edit published posts, and schedule posts for future publication. Text-first design — minimal chrome, large type, the writing carries the experience.

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

- ✓ Auth middleware reads role from DB on every request (no stale JWT roles) — v3.0
- ✓ Deactivated users rejected even with valid JWT (optionalAuth checks is_active) — v3.0
- ✓ Client validates stored token via /auth/me on startup — v3.0
- ✓ 401 response interceptor clears auth and redirects to login — v3.0
- ✓ Security headers via helmet (CSP, HSTS, X-Frame-Options: DENY) — v3.0
- ✓ Global rate limiter (200 req/min per IP) and password reset rate limiter — v3.0
- ✓ RSS feed XSS fix (HTML-encoded embed URLs/titles) — v3.0
- ✓ displayName sanitized and length-limited on registration — v3.0
- ✓ Client null-safety fixes (PostCard, PostListItem, ArtistPage) — v3.0
- ✓ EditPost auth loading gate, debounce cleanup, formatDate Z-handling — v3.0
- ✓ Embed iframe attribute allowlist (src, width, height, allow, sandbox only) — v3.0
- ✓ ViewPost re-fetches after publish (no reload hack), delete error feedback — v3.0
- ✓ Production deployment wiring (Render URL, env var validation, admin seed) — v3.0
- ✓ Dynamic OG meta tags for social sharing previews — v3.0
- ✓ 404 page, robots.txt, sitemap for SEO — v3.0
- ✓ JWT expiry reduction and origin validation (CSRF defense-in-depth) — v3.0
- ✓ Single-post N+1 query fix and profile pagination — v3.0
- ✓ Error state UI for Search/Explore pages — v3.0
- ✓ Email/SMTP validation for password reset — v3.0

- ✓ Contributors can schedule draft posts for future publish dates — v3.1
- ✓ Server auto-publishes scheduled posts within minutes of scheduled time — v3.1
- ✓ Date/time picker in local timezone, stored as UTC — v3.1
- ✓ Contributors can cancel scheduled posts (reverts to draft) — v3.1
- ✓ Contributors can reschedule or edit scheduled post content — v3.1
- ✓ My Posts dashboard shows scheduled posts with badge and scheduled time — v3.1

- ✓ Contributor analytics: per-post engagement, top artists, activity stats (total/monthly/streak) — v4.0
- ✓ Admin analytics: site-wide overview, top contributors by engagement, top artists — v4.0
- ✓ Mobile hamburger nav with animated dropdown and auto-close on route change — v4.0
- ✓ 44px touch targets on all interactive elements (like, comment, delete, submit) — v4.0
- ✓ Responsive embed iframes (no overflow on mobile) — v4.0

### Active

#### Current Milestone: v4.1 Launch

**Goal:** Make the site ready for public sharing — hero section on home page, dedicated /about page, deploy latest code.

**Target features:**
- Home page hero section with one-liner about the site, then straight into the feed
- Dedicated /about page with mission, who's behind it, how to join as a reader
- Deploy all v3.0–v4.0 code to production (Vercel + Render)

### Deferred

(None)

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

**Shipped v4.0 Analytics & Mobile** (2026-03-20): Contributor + admin analytics dashboards, mobile hamburger nav, touch targets, responsive embeds.
- 21 files changed, +1,555 / -50 lines

**Shipped v3.1 Scheduled Posts** (2026-03-20): `scheduled` status + `scheduled_at` column, setInterval auto-publisher (2-min polling), PostForm datetime-local picker, cancel/reschedule flows, My Posts scheduled section.
- 16 files changed, +921 / -52 lines

**Shipped v3.0 Hardening** (2026-03-19): Full app audit → 21 fixes across auth, security, client robustness, UX.
- Auth: DB-sourced roles, /auth/me validation, 401 interceptor, optionalAuth is_active check
- Security: helmet headers, global rate limiter, RSS XSS fix, displayName sanitization
- Client: null-safety, EditPost race condition, debounce cleanup, embed iframe allowlist, dead code removal
- UX: publish re-fetch, delete error feedback
- 28 files changed, +1,198 / -110 lines

**Shipped v3.0 Production Launch** (2026-03-02): ~18,000 LOC across React 18 + Express 5 + Turso.
- 73 files modified in v3.0 (+3,095 lines)
- Server startup validates required env vars (admin seed, SMTP) with fail-fast behavior
- Dynamic OG meta tags via Vercel serverless function with crawler UA rewrite
- Security: helmet + CSP (6 embed providers in frame-src), JWT 30d expiry, origin validation
- Performance: batchLoadPostData on single-post route (8 → 3 queries), cursor pagination on profiles
- UX: styled 404 page, error/retry states on Search and Explore
- robots.txt and sitemap.xml for SEO

**Shipped v2.1 Reader Engagement & Editorial** (2026-03-01): ~15,000 LOC across React 18 + Express 5 + Turso.
- 56 files modified in v2.1 (+6,712 lines)
- 5 DB migrations (schema init + post_artists + status/published_at + post_likes + post_comments)
- Reader accounts: separate /register-reader endpoint, /join page, role-aware UI
- Engagement: like toggle with optimistic UI, flat comments with three-way moderation
- Editorial: draft save/preview/publish workflow, post editing with "edited" indicator, My Posts dashboard
- Shared helpers: batchLoadPostData prevents N+1 across all 6 post-list endpoints
- Status filtering: `AND p.status = 'published'` on all 14 public query sites

**Pre-deploy checklist:**
- Replace `YOUR-APP.onrender.com` in `client/vercel.json` with actual Render URL
- Replace `YOURDOMAIN.com` in `client/public/robots.txt` and `client/public/sitemap.xml`
- Add `og-default.png` to `client/public/` for default social sharing image
- Set Spotify credentials in `server/.env` (affects artist auto-extraction only)

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
| Scheduling deferred to future | Draft workflow ships first; scheduling adds cron complexity | ✓ Good — shipped in v3.1 with setInterval (simpler than node-cron) |
| setInterval over node-cron for scheduler | No external dependency needed; 2-min polling is precise enough for a blog | ✓ Good — simple, zero dependencies |
| Native datetime-local over date picker library | Simplest approach; no extra bundle size; browser-native timezone handling | ✓ Good — works across modern browsers |
| v3.0 as hardening milestone | Audit found 4 critical + 5 high issues; fix before adding features | ✓ Good — all 21 requirements shipped, 0 gaps |
| DB-sourced roles over shorter JWT expiry | Reading role from DB on every request eliminates stale-role risk without disrupting UX (365d expiry stays) | ✓ Good — simpler than refresh tokens, equally effective |
| Permissive CSP with provider allowlist | Strict CSP would break Spotify/Apple Music embeds; allowlist covers all 5 oEmbed providers + Gravatar | ✓ Good — embeds work, clickjacking blocked |
| optionalAuth graceful degradation | DB failure on public routes → treat as unauthenticated (feed still loads without personalization) | ✓ Good — availability over correctness for read-only data |
| Origin validation over CSRF tokens | JWT-in-Authorization-header is inherently CSRF-resistant; origin check is defense-in-depth | ✓ Good — simpler than token-based CSRF, correct for this auth model |
| Helmet v8 + manual X-XSS-Protection | Helmet v8 removed xXssProtection default; manually set for browsers that support it | ✓ Good — comprehensive header coverage |
| Placeholder URLs for pre-deploy config | User doesn't have Render URL/domain yet; obvious placeholders easy to find-and-replace | ✓ Good — 3 files, clear pattern (YOUR-APP, YOURDOMAIN) |
| Comments query separate from batchLoadPostData | Single-post endpoint needs full comment objects with canDelete, not just counts | ✓ Good — keeps batch helper focused on post metadata |
| Profile pagination default 20, max 50 | Matches feed endpoint pattern; bounded via Math.min/Math.max | ✓ Good — consistent API design |

---
| v4.0 as analytics + mobile milestone | New feature category (analytics) + UX overhaul warrants major bump | ✓ Good — analytics motivates contributors, mobile improves reading experience |

---
*Last updated: 2026-03-20 after v4.1 Launch milestone initialization*
