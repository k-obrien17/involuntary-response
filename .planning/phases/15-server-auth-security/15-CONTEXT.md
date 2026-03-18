# Phase 15: Server Auth & Security - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden server-side auth middleware to use real-time DB state instead of stale JWT claims. Add security headers via helmet, global rate limiting, and input sanitization. All server-side — no client changes in this phase.

</domain>

<decisions>
## Implementation Decisions

### CSP & Security Headers
- Use helmet with permissive CSP: allow all 6 oEmbed provider domains (Spotify, Apple Music, YouTube, SoundCloud, Bandcamp, + Gravatar) in frame-src
- X-Frame-Options: DENY — no reason for anyone to iframe the site
- HSTS enabled — Render handles TLS, HSTS tells browsers to never try HTTP
- All standard helmet headers enabled (X-Content-Type-Options, X-XSS-Protection, etc.)

### Rate Limiting
- Global baseline: 200 req/min per IP, applied to all routes before specific limiters
- Password reset rate limit: match existing forgotPasswordLimiter config (same window/count)
- Include Retry-After header in 429 responses
- /auth/me covered by global limiter only (called once per page load, no abuse risk)

### /auth/me Response Shape
- Return same shape as login response: id, username, displayName, role, email
- Replaces stale localStorage user object on client startup
- No token refresh — just validate and return current user data
- Keep token lifecycle simple (no sliding expiry)

### Auth Failure Behavior
- authenticateToken DB failure → 503 Service Unavailable (honest about the problem)
- optionalAuth DB failure → treat as unauthenticated (graceful degradation, feed still loads)
- Deactivated users get generic 401 (don't reveal account status)
- DB errors logged with user ID for debugging (console.error, not exposed to client)

### Claude's Discretion
- Exact helmet configuration object structure
- How to structure the DB lookup in authenticateToken (single query vs cached)
- Whether to extract shared auth helper between authenticateToken and optionalAuth
- express.json limit value (100kb suggested by audit)
- displayName sanitization implementation (regex vs library)
- RSS XSS fix approach (html-entities library vs manual encoding)

</decisions>

<specifics>
## Specific Ideas

- The auth middleware changes should be backward-compatible — same JWT structure, just role sourced from DB instead of payload
- Global rate limiter should not interfere with existing per-endpoint limiters (auth, posts, likes, comments)
- RSS feed fix is surgical: HTML-encode embed.originalUrl and embed.title only

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-server-auth-security*
*Context gathered: 2026-03-18*
