# Involuntary Response

## What This Is

A curated music micro-blogging platform where invite-only contributors write short-form takes on songs, albums, and artists with inline Spotify and Apple Music embeds. Text-first design — minimal chrome, large type, the writing carries the experience.

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

### Active

- [ ] Every post has an artist — auto-extracted from embed or manually entered
- [ ] Browse-by-artist works for all posts, not just Spotify-embedded ones
- [ ] Contributors have avatars on posts and profile pages
- [ ] Full-text search across post content
- [ ] Posts can reference a song/album without embedding (styled inline link)
- [ ] Vercel deployment fully wired (`vercel.json` API proxy to Render backend)

### Deferred

- Readers can like posts (requires lightweight reader accounts) — v2.1+
- Readers can comment on posts (flat comments, not threaded) — v2.1+

### Out of Scope

- Open registration — invite-only maintains editorial voice
- Mobile app — web-first, responsive design works well
- Algorithmic feed — chronological only, no engagement gaming
- YouTube/video embeds — audio-first identity
- Long-form content — the format is brevity
- Star ratings / numerical scores — undermines nuanced takes
- Threaded comments — overkill for short-form posts

## Current Milestone: v2.0 Polish & Gaps

**Goal:** Fix artist data gaps, add contributor avatars, full-text search, inline song references, and finalize deployment wiring.

**Target features:**
- Artist data system (auto-extract + manual fallback + backfill + browse fix)
- Contributor avatars
- Full-text search
- Inline song/album references (styled links, no embed)
- Deployment fix (vercel.json API proxy)

## Context

**Shipped v1.0 MVP** (2026-02-28): 5,060 LOC across React 18 + Express 5 + Turso.
- Frontend deployed on Vercel, API on Render
- 25 pages/components, 6 API route modules, 3 DB migrations
- Embed architecture evolved to server-side oEmbed resolver (supports Spotify, Apple Music, YouTube, Vimeo, SoundCloud, Bandcamp)
- Audience: music nerds and casual listeners — accessible but deep

**Known deployment gap:** `vercel.json` needs `/api/*` proxy rewrite to Render backend before going live.

## Constraints

- **Tech stack**: React 18 / Vite 5 / Tailwind CSS 3 / Express 5 / Turso — proven, no reason to change
- **Auth**: Invite-only for contributors, public read access for everyone else
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

---
*Last updated: 2026-02-28 after v2.0 milestone start*
