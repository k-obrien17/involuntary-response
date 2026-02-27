# Involuntary Response

## What This Is

A micro-blogging platform for short-form music commentary — pithy takes on songs, albums, and artists. Not longform reviews or 800-word articles. A Twitter/Tumblr/blog hybrid where the format is a paragraph, not an essay. Minimal, text-first design where the writing carries the experience.

## Core Value

Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Contributors can post short-form music takes (~500-800 characters)
- [ ] Posts can embed Spotify or Apple Music players inline
- [ ] Posts can reference a song/album without embedding
- [ ] Main feed shows posts in reverse chronological order
- [ ] Posts are browsable by artist or tag
- [ ] Readers can like posts
- [ ] Readers can comment on posts
- [ ] Readers can share posts
- [ ] Invite-only contributor access (admin creates accounts or sends invite links)
- [ ] Multiple contributors can post under their own identity
- [ ] Minimal, clean, text-first visual design with lots of whitespace

### Out of Scope

- Open registration — v1 is invite-only contributors, public readers
- Mobile app — web-first
- Algorithmic feed — chronological only for now
- YouTube embeds — Spotify + Apple Music for v1
- Long-form content — the format is brevity

## Context

- Builder has experience with React/Express/Turso stack (Backyard Marquee)
- Same stack is a natural fit: React 18, Vite, Tailwind, Express, Turso
- Spotify integration experience from Backyard Marquee (client credentials flow)
- Apple Music embeds are new — will need research
- Audience is both music nerds and casual listeners — accessible but deep
- Name "Involuntary Response" captures the visceral, pre-thought reaction to music

## Constraints

- **Tech stack**: React/Express/Turso/Tailwind — proven stack, no reason to change
- **Auth**: Invite-only for contributors, public read access for everyone else
- **Content length**: ~500-800 characters per post — enforced culturally and by UI, soft limit
- **Embeds**: Spotify + Apple Music player embeds for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Same stack as Backyard Marquee | Known quantity, good fit for this type of app | — Pending |
| Invite-only contributors | Maintain editorial quality, expand later | — Pending |
| Paragraph-length posts | Long enough to say something real, short enough to stay punchy | — Pending |
| Spotify + Apple Music embeds | Cover most listeners without overcomplicating | — Pending |
| Minimal text-first design | The writing is the product, not the UI | — Pending |

---
*Last updated: 2026-02-26 after initialization*
