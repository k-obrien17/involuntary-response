# Requirements: Involuntary Response v3.0 Hardening

**Defined:** 2026-03-18
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## v3.0 Requirements

### Auth Hardening

- [x] **AUTH-01**: `authenticateToken` middleware reads user role from DB on every request instead of trusting JWT payload
- [x] **AUTH-02**: `optionalAuth` middleware checks `is_active` against DB, rejecting deactivated users
- [x] **AUTH-03**: Server exposes `GET /auth/me` endpoint that validates token and returns current user data
- [x] **AUTH-04**: Client calls `/auth/me` on startup to validate stored token and hydrate fresh user state
- [x] **AUTH-05**: Axios response interceptor clears auth state and redirects to `/login` on 401 responses
- [x] **AUTH-06**: `POST /api/auth/reset-password` has rate limiter matching `forgotPasswordLimiter`

### Security Infrastructure

- [x] **SEC-01**: Server uses helmet middleware for security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [x] **SEC-02**: RSS feed HTML-entity-encodes `embed.originalUrl` and `embed.title` before inserting into content
- [x] **SEC-03**: Global rate limiter applied as baseline on all routes (e.g., 200 req/min per IP)
- [x] **SEC-04**: `displayName` is sanitized (HTML stripped) and length-limited (50 chars) on registration
- [x] **SEC-05**: `express.json()` has explicit body size limit (`{ limit: '100kb' }`)

### Client Robustness

- [ ] **ROBU-01**: `PostCard` uses optional chaining for `post.tags` and `post.author` access
- [ ] **ROBU-02**: `PostListItem` uses optional chaining for `post.author` access with fallback values
- [ ] **ROBU-03**: `ArtistPage` removes redundant `decodeURIComponent` call on already-decoded `useParams()` value
- [ ] **ROBU-04**: `EditPost` waits for auth context `loading` to complete before checking ownership
- [ ] **ROBU-05**: `EmbedInput` cleans up debounce timer on component unmount
- [ ] **ROBU-06**: `formatDate` helper handles dates that already end with 'Z' without double-appending
- [ ] **ROBU-07**: `ProtectedRoute` component removed (dead code, unused anywhere)
- [ ] **ROBU-08**: `EmbedPreview` allowlists specific iframe attributes (src, width, height, allow, sandbox) instead of accepting all

### UX Fixes

- [ ] **UX-01**: `ViewPost` re-fetches post data after publish instead of using `window.location.reload()`
- [ ] **UX-02**: `EditPost` shows error message to user when post deletion fails

## Future Requirements

- Contributors can schedule posts for future publish dates (deferred from v2.1)
- Comment author names linked to profile pages
- Mobile nav hamburger menu for admin/contributor links
- Tag remove buttons have `aria-label` for accessibility
- Avatar background colors constrained to ensure contrast with white text
- `parseCursor` validates input format
- Expired password reset tokens cleaned up periodically

## Out of Scope

| Feature | Reason |
|---------|--------|
| Refresh token rotation | Overkill for current user base; DB role check on each request is sufficient |
| Shorter JWT expiry | DB role check eliminates the stale-role risk; 365d is fine for UX |
| FTS5 migration | Current LIKE search works at current data volume; revisit when needed |
| CI/CD pipeline | No automated deployment infra yet; manual audit sufficient |
| Profile post pagination | Contributors write tens not thousands; premature optimization |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 15 | Complete |
| AUTH-02 | Phase 15 | Complete |
| AUTH-03 | Phase 15 | Complete |
| AUTH-04 | Phase 16 | Complete |
| AUTH-05 | Phase 16 | Complete |
| AUTH-06 | Phase 15 | Complete |
| SEC-01 | Phase 15 | Complete |
| SEC-02 | Phase 15 | Complete |
| SEC-03 | Phase 15 | Complete |
| SEC-04 | Phase 15 | Complete |
| SEC-05 | Phase 15 | Complete |
| ROBU-01 | Phase 17 | Pending |
| ROBU-02 | Phase 17 | Pending |
| ROBU-03 | Phase 17 | Pending |
| ROBU-04 | Phase 17 | Pending |
| ROBU-05 | Phase 17 | Pending |
| ROBU-06 | Phase 17 | Pending |
| ROBU-07 | Phase 17 | Pending |
| ROBU-08 | Phase 17 | Pending |
| UX-01 | Phase 17 | Pending |
| UX-02 | Phase 17 | Pending |

**Coverage:**
- v3.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after roadmap creation*
