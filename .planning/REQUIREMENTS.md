# Requirements: Involuntary Response v4.0 Analytics & Mobile

**Defined:** 2026-03-20
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music -- and the music is right there to listen to.

## v4.0 Requirements

### Contributor Analytics

- [x] **ANLY-01**: Contributor can view a stats page showing like count and comment count per post
- [x] **ANLY-02**: Contributor can see their most-liked and most-commented posts ranked
- [x] **ANLY-03**: Contributor can see their top artists (most-written-about) with post counts
- [x] **ANLY-04**: Contributor can see activity stats: total posts, posts this month, current posting streak
- [x] **ANLY-05**: Stats page is accessible from the navbar (contributor-only)

### Admin Analytics

- [x] **ADMN-01**: Admin can view site-wide stats: total posts, total likes, total comments, total contributors, total readers
- [x] **ADMN-02**: Admin can see top contributors ranked by post count and engagement
- [x] **ADMN-03**: Admin can see site-wide top artists across all contributors

### Mobile UX

- [ ] **MOBL-01**: Navbar collapses contributor/admin links into a hamburger menu on mobile screens
- [ ] **MOBL-02**: Hamburger menu opens/closes with smooth animation and closes on route change
- [ ] **MOBL-03**: All interactive elements (buttons, links, like/comment actions) meet minimum touch target size (44px)
- [ ] **MOBL-04**: Post embeds (Spotify/Apple Music iframes) resize responsively on mobile without overflow

## Future Requirements

- Collections/Series (grouping posts into themed sets)
- Pinned/Featured posts (admin pins a post to top of feed)
- Related posts ("More from this artist" on post pages)
- Accessibility pass (aria-labels, keyboard nav, avatar contrast)
- FTS5 migration (when data volume warrants)

## Out of Scope

| Feature | Reason |
|---------|--------|
| View counts / page analytics | No tracking infrastructure; privacy-first approach |
| Revenue/monetization metrics | Not a commercial platform |
| A/B testing | Overkill for a small contributor pool |
| Native mobile app | Web-first, responsive design is sufficient |
| Push notifications | Out of scope for the project |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANLY-01 | Phase 20 | Complete |
| ANLY-02 | Phase 20 | Complete |
| ANLY-03 | Phase 20 | Complete |
| ANLY-04 | Phase 20 | Complete |
| ANLY-05 | Phase 20 | Complete |
| ADMN-01 | Phase 21 | Complete |
| ADMN-02 | Phase 21 | Complete |
| ADMN-03 | Phase 21 | Complete |
| MOBL-01 | Phase 22 | Pending |
| MOBL-02 | Phase 22 | Pending |
| MOBL-03 | Phase 22 | Pending |
| MOBL-04 | Phase 22 | Pending |

**Coverage:**
- v4.0 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
