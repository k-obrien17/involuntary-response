# Requirements: Involuntary Response

**Defined:** 2026-02-28
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## v2.0 Requirements

Requirements for v2.0 Polish & Gaps. Each maps to roadmap phases.

### Artist Data

- [ ] **ART-01**: Post creation auto-extracts artist name from Spotify embed
- [ ] **ART-02**: Post creation auto-extracts artist name from Apple Music embed
- [ ] **ART-03**: Contributor can manually enter artist name when auto-extraction fails or no embed
- [ ] **ART-04**: Artist name displayed on every post in feed and permalink views
- [ ] **ART-05**: Browse-by-artist includes posts from all embed types

### Avatars

- [x] **AVTR-01**: Contributor avatar auto-generated from email (Gravatar) with initials fallback
- [x] **AVTR-02**: Avatar displayed on posts in feed and permalink views
- [x] **AVTR-03**: Avatar displayed on contributor profile page

### Search

- [ ] **SRCH-01**: User can search post content via text query
- [ ] **SRCH-02**: Search results include matches from artist names
- [ ] **SRCH-03**: Search results include matches from tags
- [ ] **SRCH-04**: Search results include matches from contributor names

### References

- [ ] **REF-01**: Contributor can add inline song/album reference (Spotify or Apple Music link) in post text
- [ ] **REF-02**: Inline reference renders as a styled music link that opens in the streaming service

### Deployment

- [x] **DEPL-01**: `vercel.json` configured with `/api/*` proxy rewrite to Render backend

## Future Requirements

Deferred to v2.1+. Tracked but not in current roadmap.

### Reader Engagement

- **ENGR-01**: Readers can like posts (requires lightweight reader accounts)
- **ENGR-02**: Readers can comment on posts (flat comments, not threaded)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Open registration | Invite-only maintains editorial voice |
| Mobile app | Web-first, responsive design works well |
| Algorithmic feed | Chronological only, no engagement gaming |
| YouTube/video embeds | Audio-first identity |
| Long-form content | The format is brevity |
| Star ratings / numerical scores | Undermines nuanced takes |
| Threaded comments | Overkill for short-form posts |
| Artist backfill (retroactive) | Can be done manually or in a future pass |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ART-01 | Phase 7 | Pending |
| ART-02 | Phase 7 | Pending |
| ART-03 | Phase 7 | Pending |
| ART-04 | Phase 7 | Pending |
| ART-05 | Phase 7 | Pending |
| AVTR-01 | Phase 6 | Complete |
| AVTR-02 | Phase 6 | Complete |
| AVTR-03 | Phase 6 | Complete |
| SRCH-01 | Phase 9 | Pending |
| SRCH-02 | Phase 9 | Pending |
| SRCH-03 | Phase 9 | Pending |
| SRCH-04 | Phase 9 | Pending |
| REF-01 | Phase 8 | Pending |
| REF-02 | Phase 8 | Pending |
| DEPL-01 | Phase 6 | Complete |

**Coverage:**
- v2.0 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation*
