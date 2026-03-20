# Requirements: Involuntary Response v4.1 Launch

**Defined:** 2026-03-20
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music -- and the music is right there to listen to.

## v4.1 Requirements

### Home Page

- [x] **LNCH-01**: Home page has a hero section with a one-liner about the site above the feed
- [x] **LNCH-02**: Hero section links to /about for visitors who want to learn more
- [x] **LNCH-03**: Feed starts immediately below the hero -- no extra clicks to see content

### About Page

- [x] **LNCH-04**: Dedicated /about page explains what Involuntary Response is
- [x] **LNCH-05**: About page describes who's behind it (editorial voice, not corporate)
- [x] **LNCH-06**: About page has clear CTAs: "Join as a reader" (/join) and "Subscribe via RSS"

### Deployment

- [ ] **LNCH-07**: Latest code (v3.0-v4.0) is deployed to Vercel (frontend) and Render (backend)
- [ ] **LNCH-08**: Vercel build succeeds with no errors; API proxy routes work correctly

## Future Requirements

- Collections/Series (grouping posts into themed sets)
- Pinned/Featured posts (admin pins a post to top of feed)
- Related posts ("More from this artist" on post pages)
- Accessibility pass (aria-labels, keyboard nav, avatar contrast)
- FTS5 migration (when data volume warrants)
- Custom domain

## Out of Scope

| Feature | Reason |
|---------|--------|
| SEO optimization | OG meta tags already handled; further SEO is premature |
| Custom domain setup | Separate from code -- can be done anytime via Vercel dashboard |
| Analytics/tracking scripts | Privacy-first; no third-party tracking |
| Marketing copy | The about page is editorial, not a marketing landing page |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LNCH-01 | Phase 23 | Complete |
| LNCH-02 | Phase 23 | Complete |
| LNCH-03 | Phase 23 | Complete |
| LNCH-04 | Phase 23 | Complete |
| LNCH-05 | Phase 23 | Complete |
| LNCH-06 | Phase 23 | Complete |
| LNCH-07 | Phase 24 | Pending |
| LNCH-08 | Phase 24 | Pending |

**Coverage:**
- v4.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
