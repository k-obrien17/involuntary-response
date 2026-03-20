# Requirements: Involuntary Response v4.1 Launch

**Defined:** 2026-03-20
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## v4.1 Requirements

### Home Page

- [ ] **LNCH-01**: Home page has a hero section with a one-liner about the site above the feed
- [ ] **LNCH-02**: Hero section links to /about for visitors who want to learn more
- [ ] **LNCH-03**: Feed starts immediately below the hero — no extra clicks to see content

### About Page

- [ ] **LNCH-04**: Dedicated /about page explains what Involuntary Response is
- [ ] **LNCH-05**: About page describes who's behind it (editorial voice, not corporate)
- [ ] **LNCH-06**: About page has clear CTAs: "Join as a reader" (/join) and "Subscribe via RSS"

### Deployment

- [ ] **LNCH-07**: Latest code (v3.0–v4.0) is deployed to Vercel (frontend) and Render (backend)
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
| Custom domain setup | Separate from code — can be done anytime via Vercel dashboard |
| Analytics/tracking scripts | Privacy-first; no third-party tracking |
| Marketing copy | The about page is editorial, not a marketing landing page |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LNCH-01 | — | Pending |
| LNCH-02 | — | Pending |
| LNCH-03 | — | Pending |
| LNCH-04 | — | Pending |
| LNCH-05 | — | Pending |
| LNCH-06 | — | Pending |
| LNCH-07 | — | Pending |
| LNCH-08 | — | Pending |

**Coverage:**
- v4.1 requirements: 8 total
- Mapped to phases: 0
- Unmapped: 8 ⚠️

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
