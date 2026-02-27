# Roadmap: Involuntary Response

## Overview

Involuntary Response is a curated music micro-blogging platform where invite-only contributors write short-form takes on songs, albums, and artists with inline Spotify and Apple Music embeds. The roadmap delivers a working platform in five phases: foundation and invite-only auth, the post creation pipeline with embed support, the public reading experience (feed and post display), browse/discovery/profiles, and finally sharing infrastructure with dark mode. Each phase delivers a complete, verifiable capability. Social engagement features (likes, comments) are deferred to v2.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Auth** - Project scaffolding, database schema, invite-only auth system, admin invite management (completed 2026-02-27)
- [ ] **Phase 2: Post Creation and Embeds** - Post CRUD with Spotify and Apple Music embed pipeline, tags, edit/delete
- [ ] **Phase 3: Feed and Post Display** - Reverse-chronological feed, post permalinks, text-first responsive design
- [ ] **Phase 4: Browse, Discovery, and Profiles** - Browse by tag/artist/contributor, contributor profiles with bio
- [ ] **Phase 5: Sharing and Distribution** - OG meta tags for social previews, RSS feed, dark mode

## Phase Details

### Phase 1: Foundation and Auth
**Goal**: Contributors can register via invite, log in, and stay authenticated -- and admins can manage the invite system
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, PROF-01
**Success Criteria** (what must be TRUE):
  1. Admin can generate an invite link and see it appear in the admin dashboard
  2. A new contributor can use an invite link to register with email, password, display name, and username
  3. Contributor can log in, close the browser, reopen it, and still be logged in
  4. Contributor can log out from any page and is redirected appropriately
  5. Admin can view all active/used invite tokens and revoke unused ones
**Plans:** 3/3 plans complete

Plans:
- [ ] 01-01-PLAN.md — Server foundation: Turso schema, auth middleware, auth routes (register/login/forgot-password/reset-password), admin seed
- [ ] 01-02-PLAN.md — Client foundation: React shell, AuthContext, API client, route guards, Navbar, auth pages
- [ ] 01-03-PLAN.md — Admin dashboard: invite CRUD API, contributor management API, admin UI pages

### Phase 2: Post Creation and Embeds
**Goal**: Contributors can write short-form music takes with inline Spotify and Apple Music embeds, manage tags, and edit or delete their posts
**Depends on**: Phase 1
**Requirements**: POST-01, POST-02, POST-03, POST-04, POST-05, POST-06
**Success Criteria** (what must be TRUE):
  1. Contributor can write a post with a character counter that signals the ~800 character soft limit, and publish it
  2. Contributor can paste a Spotify track or album URL and see an inline embed preview before publishing
  3. Contributor can paste an Apple Music track or album URL and see an inline embed preview before publishing
  4. Contributor can add up to 5 tags to a post, edit a published post, and delete their own posts
**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md — Server: DB migration (posts, post_embeds, post_tags), post CRUD API with embed validation and tag management
- [ ] 02-02-PLAN.md — Client: Post creation/edit UI with embed parser, live Spotify/Apple Music preview, tag input, route wiring

### Phase 3: Feed and Post Display
**Goal**: Anyone on the internet can visit the site, scroll through a clean reverse-chronological feed of posts, and click into individual posts -- with a minimal, text-first, responsive layout
**Depends on**: Phase 2
**Requirements**: DISC-01, SHAR-01, DSGN-01, DSGN-02
**Success Criteria** (what must be TRUE):
  1. Visitor sees a reverse-chronological feed of posts on the home page with embedded music players rendered as click-to-load placeholders
  2. Each post has a clean permalink URL that loads the full post on its own page
  3. The layout is text-first with large type, generous whitespace, and a single content column -- on both desktop and mobile
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Browse, Discovery, and Profiles
**Goal**: Visitors can discover posts by tag, by artist, and by contributor -- and contributor profiles show identity and collected work
**Depends on**: Phase 3
**Requirements**: DISC-02, DISC-03, DISC-04, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. Visitor can click a tag on any post and see all posts with that tag
  2. Visitor can click an artist name and see all posts about that artist
  3. Visitor can click a contributor name and see their profile page with bio and all their posts
  4. Browse pages maintain the same text-first, responsive design as the feed
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Sharing and Distribution
**Goal**: Posts shared on social media show rich previews with album art, the site has an RSS feed for subscribers, and readers can toggle dark mode
**Depends on**: Phase 3 (OG tags need post display), Phase 4 (profile pages exist for contributor links)
**Requirements**: SHAR-02, SHAR-03, DSGN-03
**Success Criteria** (what must be TRUE):
  1. When a post permalink is shared on Twitter/Slack/iMessage, the preview shows the post title, an excerpt, and album artwork
  2. Visitors can subscribe to an RSS feed that includes recent posts with their full text and embed links
  3. Site detects system dark/light preference and applies the correct theme, with a manual toggle that persists across sessions
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Auth | 3/3 | Complete    | 2026-02-27 |
| 2. Post Creation and Embeds | 0/2 | Planned | - |
| 3. Feed and Post Display | 0/0 | Not started | - |
| 4. Browse, Discovery, and Profiles | 0/0 | Not started | - |
| 5. Sharing and Distribution | 0/0 | Not started | - |
