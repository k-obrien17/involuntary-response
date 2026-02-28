# Roadmap: Involuntary Response

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-02-28)
- 🚧 **v2.0 Polish & Gaps** -- Phases 6-9 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) -- SHIPPED 2026-02-28</summary>

- [x] Phase 1: Foundation and Auth (3/3 plans) -- completed 2026-02-27
- [x] Phase 2: Post Creation and Embeds (2/2 plans) -- completed 2026-02-27
- [x] Phase 3: Feed and Post Display (2/2 plans) -- completed 2026-02-27
- [x] Phase 4: Browse, Discovery, and Profiles (3/3 plans) -- completed 2026-02-28
- [x] Phase 5: Sharing and Distribution (2/2 plans) -- completed 2026-02-28

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v2.0 Polish & Gaps

**Milestone Goal:** Fix artist data gaps, add contributor avatars, full-text search, inline song references, and finalize deployment wiring.

- [ ] **Phase 6: Deployment and Avatars** - Wire production API proxy and add contributor identity visuals
- [ ] **Phase 7: Artist Data** - Ensure every post has an artist via auto-extraction, manual entry, and browse fix
- [ ] **Phase 8: Inline References** - Let contributors reference songs/albums as styled links without embedding
- [ ] **Phase 9: Full-Text Search** - Search across post content, artist names, tags, and contributors

## Phase Details

### Phase 6: Deployment and Avatars
**Goal**: Production deployment is fully wired and every contributor has a visible identity on posts and profiles
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: DEPL-01, AVTR-01, AVTR-02, AVTR-03
**Success Criteria** (what must be TRUE):
  1. Vercel frontend proxies `/api/*` requests to the Render backend without CORS errors
  2. Contributor avatar appears next to author name on every post in the feed
  3. Contributor avatar appears on the post permalink page
  4. Contributor profile page displays their avatar
  5. Contributors without a Gravatar see their initials as a fallback avatar
**Plans**: 2 (Wave 1 parallel)

Plans:
- [x] 06-01: Vercel API proxy rewrite (DEPL-01)
- [ ] 06-02: Avatar system — server hash + component + integration (AVTR-01, AVTR-02, AVTR-03)

### Phase 7: Artist Data
**Goal**: Every post reliably has an artist name -- auto-extracted from embeds or manually entered -- and browse-by-artist works across all embed types
**Depends on**: Phase 6
**Requirements**: ART-01, ART-02, ART-03, ART-04, ART-05
**Success Criteria** (what must be TRUE):
  1. Creating a post with a Spotify embed auto-populates the artist name without contributor action
  2. Creating a post with an Apple Music embed auto-populates the artist name without contributor action
  3. Contributor can manually type an artist name when auto-extraction fails or no embed is present
  4. Artist name is visible on every post in the feed and on the permalink page
  5. Browse-by-artist page includes posts from Spotify, Apple Music, and manually-entered artists
**Plans**: 2 (Wave 1 → Wave 2)

Plans:
- [ ] 07-01: Apple Music artist extraction + manual artist API support (ART-01, ART-02, ART-03)
- [ ] 07-02: Client-side artist input and display fixes (ART-03, ART-04, ART-05)

### Phase 8: Inline References
**Goal**: Contributors can mention a song or album in their post text as a clickable link that opens in the streaming service, without embedding a player
**Depends on**: Phase 7
**Requirements**: REF-01, REF-02
**Success Criteria** (what must be TRUE):
  1. Contributor can insert a Spotify or Apple Music link inline while writing a post and it is recognized as a reference
  2. Inline references render as visually distinct styled links (not plain URLs, not embedded players)
  3. Clicking an inline reference opens the song/album in the corresponding streaming service
**Plans**: 1 (Wave 1)

Plans:
- [ ] 08-01: RichBody component + integration -- inline music URL detection and styled link rendering (REF-01, REF-02)

### Phase 9: Full-Text Search
**Goal**: Users can find posts by searching across content, artist names, tags, and contributor names from anywhere on the site
**Depends on**: Phase 7 (artist data must be populated for artist name search)
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04
**Success Criteria** (what must be TRUE):
  1. User can enter a text query and see matching posts from post body content
  2. Searching an artist name returns posts about that artist (even if the search term is not in the post body)
  3. Searching a tag name returns posts tagged with that term
  4. Searching a contributor name returns posts by that contributor
  5. Search is accessible from the main navigation on every page
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Auth | v1.0 | 3/3 | Complete | 2026-02-27 |
| 2. Post Creation and Embeds | v1.0 | 2/2 | Complete | 2026-02-27 |
| 3. Feed and Post Display | v1.0 | 2/2 | Complete | 2026-02-27 |
| 4. Browse, Discovery, and Profiles | v1.0 | 3/3 | Complete | 2026-02-28 |
| 5. Sharing and Distribution | v1.0 | 2/2 | Complete | 2026-02-28 |
| 6. Deployment and Avatars | v2.0 | 1/2 | In Progress | - |
| 7. Artist Data | v2.0 | 0/2 | Not started | - |
| 8. Inline References | v2.0 | 0/1 | Not started | - |
| 9. Full-Text Search | v2.0 | 0/? | Not started | - |
