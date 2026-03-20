# Milestones

## v1.0 MVP (Shipped: 2026-02-28)

**Phases completed:** 5 phases, 12 plans, 0 tasks

**Key accomplishments:**
- Invite-only auth system with admin dashboard, invite management, contributor accounts, password reset
- Post creation pipeline with inline Spotify and Apple Music embeds via server-side oEmbed resolver
- Text-first reverse-chronological feed with click-to-load embeds, cursor pagination, prose typography
- Browse and discovery — filter by tag, artist, or contributor; Explore hub; profile pages with inline bio editing
- Social sharing — OG meta tags via Vercel serverless, RSS feed, dark mode with system preference detection

**Stats:** 5,060 LOC (2,470 client + 2,590 server) | 119 files | 31 commits | 44 days

---


## v2.0 Polish & Gaps (Shipped: 2026-02-28)

**Phases completed:** 4 phases, 7 plans

**Key accomplishments:**
- Vercel API proxy rewrite forwarding `/api/*` to Render backend for production deployment
- Gravatar avatar system with initials fallback on posts, feeds, and profile pages
- Apple Music + Spotify + manual artist extraction with source tracking and live preview
- BigInt coercion fix for libsql database driver (global db.get/db.all fix)
- Inline music reference rendering — Spotify/Apple Music URLs as styled links in post body
- Full-text search across post content, artist names, tags, and contributor names

**Stats:** +3,478 LOC | 41 files | 25 commits | 1 day

---


## v2.1 Reader Engagement & Editorial (Shipped: 2026-03-01)

**Phases completed:** 5 phases, 10 plans

**Key accomplishments:**
- Schema safety net: BigInt coercion + status filtering across all 14 public query sites
- Reader accounts with /join registration, role-aware UI, and separate auth flow
- Like system with optimistic UI toggle and one-per-reader constraint
- Flat comments with three-way moderation (author, post owner, admin)
- Draft save/preview/publish workflow, post editing with "edited" indicator, My Posts dashboard

**Stats:** +6,712 LOC | 56 files | 42 commits | 1 day

---


## v3.0 Production Launch (Shipped: 2026-03-02)

**Phases completed:** 5 phases, 6 plans

**Key accomplishments:**
- Server startup env validation (fail-fast on missing admin seed vars, SMTP warning + 503 on password reset)
- Dynamic OG meta tags for social sharing with crawler-aware Vercel rewrite routing
- Security headers (helmet + CSP for 6 embed providers) and JWT expiry reduced from 365 to 30 days
- Single-post N+1 queries eliminated (8 serial → 3 batched), profile cursor pagination added
- Styled 404 page replacing redirect-to-home, error/retry states for Search and Explore

**Stats:** +3,095 LOC | 73 files | 31 commits | 1 day

---


## v3.0 Hardening (Shipped: 2026-03-19)

**Phases completed:** 3 phases, 4 plans

**Key accomplishments:**
- Auth middleware hardened: DB-sourced roles on every request, optionalAuth is_active check, /auth/me endpoint for client validation
- Security headers via helmet (CSP with oEmbed provider allowlist, HSTS, X-Frame-Options: DENY)
- Global rate limiter (200 req/min per IP), password reset rate limiter, displayName sanitization
- Client auth integration: /auth/me startup validation, 401 response interceptor with auto-logout
- RSS feed XSS fix (HTML-encoded embed URLs/titles), explicit body size limit
- Client robustness: null-safety (PostCard, PostListItem), EditPost auth loading gate, debounce cleanup, embed iframe attribute allowlist, dead code removal

**Stats:** +1,198 / -110 LOC | 28 files | 9 feature commits

---


## v3.1 Scheduled Posts (Shipped: 2026-03-20)

**Phases completed:** 2 phases, 4 plans

**Key accomplishments:**
- Schema migration adding `scheduled_at` column; `scheduled` status distinct from draft/published
- Server-side auto-publisher (setInterval, 2-minute polling) that publishes due posts and handles server-down catchup
- API extended: create/update accept `scheduled` status with future-time validation; cancel reverts to draft
- PostForm datetime-local picker for scheduling in contributor's local timezone, stored as UTC
- CreatePost/EditPost wired with schedule, reschedule, and cancel-schedule flows
- My Posts dashboard with three-section layout (Drafts → Scheduled → Published) and blue scheduled badge

**Stats:** +921 / -52 LOC | 16 files | 5 feature commits

---


## v4.0 Analytics & Mobile (Shipped: 2026-03-20)

**Phases completed:** 3 phases, 5 plans

**Key accomplishments:**
- Contributor analytics: per-post engagement stats, sortable by likes/comments, top artists, activity cards (total posts, monthly count, posting streak)
- Admin analytics: site-wide overview (total posts/likes/comments/contributors/readers), top contributors ranked by engagement, top artists across all contributors
- Analytics API: 6 new endpoints in server/routes/analytics.js with contributor and admin auth middleware
- Mobile hamburger nav: animated dropdown, auto-close on route change, 44px touch targets on all interactive elements
- Responsive embeds: Spotify/Apple Music iframes scale on narrow screens without overflow

**Stats:** +1,555 / -50 LOC | 21 files | 10 feature commits

---

