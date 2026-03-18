# Requirements: Involuntary Response v3.0 Hardening

**Defined:** 2026-03-18
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## v3.0 Requirements

### Auth Hardening

- [ ] **AUTH-01**: `authenticateToken` middleware reads user role from DB on every request instead of trusting JWT payload
- [ ] **AUTH-02**: `optionalAuth` middleware checks `is_active` against DB, rejecting deactivated users
- [ ] **AUTH-03**: Server exposes `GET /auth/me` endpoint that validates token and returns current user data
- [ ] **AUTH-04**: Client calls `/auth/me` on startup to validate stored token and hydrate fresh user state
- [ ] **AUTH-05**: Axios response interceptor clears auth state and redirects to `/login` on 401 responses
- [ ] **AUTH-06**: `POST /api/auth/reset-password` has rate limiter matching `forgotPasswordLimiter`

### Security Infrastructure

- [ ] **SEC-01**: Server uses helmet middleware for security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] **SEC-02**: RSS feed HTML-entity-encodes `embed.originalUrl` and `embed.title` before inserting into content
- [ ] **SEC-03**: Global rate limiter applied as baseline on all routes (e.g., 200 req/min per IP)
- [ ] **SEC-04**: `displayName` is sanitized (HTML stripped) and length-limited (50 chars) on registration
- [ ] **SEC-05**: `express.json()` has explicit body size limit (`{ limit: '100kb' }`)

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
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| AUTH-06 | — | Pending |
| SEC-01 | — | Pending |
| SEC-02 | — | Pending |
| SEC-03 | — | Pending |
| SEC-04 | — | Pending |
| SEC-05 | — | Pending |
| ROBU-01 | — | Pending |
| ROBU-02 | — | Pending |
| ROBU-03 | — | Pending |
| ROBU-04 | — | Pending |
| ROBU-05 | — | Pending |
| ROBU-06 | — | Pending |
| ROBU-07 | — | Pending |
| ROBU-08 | — | Pending |
| UX-01 | — | Pending |
| UX-02 | — | Pending |

**Coverage:**
- v3.0 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after initial definition*
