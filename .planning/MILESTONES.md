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

