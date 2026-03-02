# Requirements: Involuntary Response

**Defined:** 2026-03-01
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## v3.0 Requirements

Requirements for Production Launch milestone. Each maps to roadmap phases.

### Deployment

- [x] **DEPLOY-01**: Vercel API proxy routes to actual Render backend URL (not placeholder)
- [x] **DEPLOY-02**: Admin seed account env vars validated on startup with clear error messages
- [x] **DEPLOY-03**: SMTP configuration validated on startup; password reset endpoint returns error if email unavailable
- [x] **DEPLOY-04**: robots.txt and sitemap.xml served from public directory

### Social Sharing

- [x] **SHARE-01**: Post permalink pages render dynamic OG meta tags (title, description, album art) for social crawlers
- [x] **SHARE-02**: Default OG tags for non-post pages (homepage, explore, profiles)

### Security

- [x] **SEC-01**: Response headers include CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- [x] **SEC-02**: JWT token expiry reduced to 30 days
- [x] **SEC-03**: CSRF protection on state-changing endpoints

### Performance

- [x] **PERF-01**: Single-post route uses batched queries instead of serial N+1 pattern
- [x] **PERF-02**: Profile page paginates posts with cursor pagination

### UX

- [x] **UX-01**: Unknown routes render a 404 page (not redirect to home)
- [x] **UX-02**: Search and Explore pages show error states with retry affordance

## Future Requirements

Deferred until v3.0 core is working and evaluated.

### Scheduling & Dashboard

- **SCHED-01**: Contributor can schedule a post for future publish date/time
- **SCHED-02**: Scheduled posts auto-publish at the set time

### Polish

- **POLISH-01**: Skeleton loading states for feed and post pages
- **POLISH-02**: Custom favicon and PWA manifest
- **POLISH-03**: Embed HTML sanitization via DOMPurify
- **POLISH-04**: Analytics/metrics dashboard for contributors

## Out of Scope

| Feature | Reason |
|---------|--------|
| httpOnly cookie auth | Requires significant auth refactor; localStorage + short JWT is acceptable for launch |
| Refresh tokens | Added complexity; 30-day expiry with re-login is fine for small user base |
| Database backup automation | Turso handles backups; document recovery procedure instead of building tooling |
| Rate limit tuning | Current limits are reasonable; tune based on production traffic data |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPLOY-01 | Phase 15 | Complete |
| DEPLOY-02 | Phase 15 | Complete |
| DEPLOY-03 | Phase 15 | Complete |
| DEPLOY-04 | Phase 15 | Complete |
| SHARE-01 | Phase 16 | Complete |
| SHARE-02 | Phase 16 | Complete |
| SEC-01 | Phase 17 | Complete |
| SEC-02 | Phase 17 | Complete |
| SEC-03 | Phase 17 | Complete |
| PERF-01 | Phase 18 | Complete |
| PERF-02 | Phase 18 | Complete |
| UX-01 | Phase 19 | Complete |
| UX-02 | Phase 19 | Complete |

**Coverage:**
- v3.0 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
