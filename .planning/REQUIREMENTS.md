# Requirements: Involuntary Response

**Defined:** 2026-02-26
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: Admin can generate invite links with unique tokens
- [x] **AUTH-02**: Contributor can register using an invite token with email and password
- [x] **AUTH-03**: Contributor can log in with email and password
- [x] **AUTH-04**: Contributor session persists across browser refresh
- [x] **AUTH-05**: Contributor can log out from any page
- [x] **AUTH-06**: Admin can view and manage active invite tokens via web dashboard

### Posts

- [x] **POST-01**: Contributor can create a text post with ~800 character soft limit
- [x] **POST-02**: Contributor can embed a Spotify track/album by pasting a URL
- [x] **POST-03**: Contributor can embed an Apple Music track/album by pasting a URL
- [x] **POST-04**: Contributor can add up to 5 tags per post
- [x] **POST-05**: Contributor can edit their own published posts
- [x] **POST-06**: Contributor can delete their own posts

### Discovery

- [ ] **DISC-01**: Visitor can view a reverse-chronological feed of all posts
- [ ] **DISC-02**: Visitor can browse posts filtered by tag
- [ ] **DISC-03**: Visitor can browse posts filtered by artist
- [ ] **DISC-04**: Visitor can view all posts by a specific contributor

### Profiles

- [x] **PROF-01**: Contributor has a display name and username
- [ ] **PROF-02**: Contributor can write a bio (~300 characters)
- [ ] **PROF-03**: Visitor can view a contributor's profile page

### Sharing

- [ ] **SHAR-01**: Each post has a clean permalink URL
- [ ] **SHAR-02**: Shared post links show rich previews on social media (OG meta tags with artist image + excerpt)
- [ ] **SHAR-03**: Site provides an RSS feed of recent posts

### Design

- [ ] **DSGN-01**: Minimal text-first layout with large type, whitespace, and single content column
- [ ] **DSGN-02**: Fully responsive and mobile-friendly
- [ ] **DSGN-03**: Dark mode with system preference detection and manual toggle

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Social Engagement

- **SOCL-01**: Reader can like posts (requires lightweight reader accounts)
- **SOCL-02**: Reader can comment on posts (flat comments, not threaded)
- **SOCL-03**: Contributor can delete comments on their own posts
- **SOCL-04**: Admin can delete any comment

### Profiles (Enhanced)

- **PROF-04**: Contributor can upload an avatar image

### Discovery (Enhanced)

- **DISC-05**: Artist detail pages with aggregated stats (post count, contributor count)
- **DISC-06**: Music references without embed (styled inline link to Spotify/Apple Music)

### Distribution

- **DIST-01**: Email notifications for contributors (new comments, etc.)
- **DIST-02**: Full-text search across posts

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Star ratings / numerical scores | Reduces nuanced takes to a number, undermines "writing is the product" ethos |
| Algorithmic / trending feed | Complexity, perverse incentives — chronological is the stated constraint |
| Rich text editor / markdown | Format is a paragraph — constraints force punchy writing |
| Threaded / nested comments | Fragments discussion, overkill for short-form posts |
| User-uploaded images in posts | Storage complexity, pulls focus from text-first design |
| YouTube / video embeds | Heavy iframes, muddies audio-first identity |
| Open registration | Destroys curated editorial voice |
| Follower / following system | Meaningless with <20 invite-only contributors |
| Mobile app | Web-first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| POST-01 | Phase 2 | Complete |
| POST-02 | Phase 2 | Complete |
| POST-03 | Phase 2 | Complete |
| POST-04 | Phase 2 | Complete |
| POST-05 | Phase 2 | Complete |
| POST-06 | Phase 2 | Complete |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 4 | Pending |
| DISC-03 | Phase 4 | Pending |
| DISC-04 | Phase 4 | Pending |
| PROF-01 | Phase 1 | Complete |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |
| SHAR-01 | Phase 3 | Pending |
| SHAR-02 | Phase 5 | Pending |
| SHAR-03 | Phase 5 | Pending |
| DSGN-01 | Phase 3 | Pending |
| DSGN-02 | Phase 3 | Pending |
| DSGN-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
