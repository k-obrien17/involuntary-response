---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Hardening
status: unknown
last_updated: "2026-03-19T11:58:38Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 10
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.
**Current focus:** v3.0 Hardening — Phase 16: Client Auth Integration

## Current Position

Phase: 16 (second of 3 in v3.0)
Plan: 1 of 1 in current phase (phase complete)
Status: Phase 16 complete
Last activity: 2026-03-19 — Completed 16-01 Client Auth Integration

Progress (v3.0): [██████░░░░] 60%

## Performance Metrics

**Velocity:**
- Total plans completed: 39 (v1.0: 12, v2.0: 7, v2.1: 17, v3.0: 3)

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 15    | 01   | 2min     | 3     | 2     |
| 15    | 02   | 2min     | 2     | 4     |
| 16    | 01   | 2min     | 2     | 2     |

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table. Recent:
- v3.0 milestone scoped from full app audit findings (4 Critical, 5 High, 15 Medium, 10 Low)
- Scheduled posts deferred again — hardening takes priority
- v3.0 major version bump due to auth model changes
- Server auth changes (Phase 15) must land before client auth integration (Phase 16)
- Phase 17 (client robustness) independent of Phase 16; both depend on Phase 15
- [Phase 15-01]: Auth middleware sources req.user from DB, JWT only used for ID extraction
- [Phase 15-01]: authenticateToken returns 503 on DB failure (separate try/catch for JWT vs DB)
- [Phase 15-01]: optionalAuth DB failures silently degrade to unauthenticated
- [Phase 15-01]: Generic 401 for deactivated users — no account status leak
- [Phase 15-02]: Helmet CSP allows frame-src for Spotify, Apple Music, YouTube, SoundCloud, Bandcamp embed domains
- [Phase 16-01]: 401 interceptor operates on localStorage/window.location directly, not via AuthContext (avoids circular dep)
- [Phase 16-01]: Auth endpoints excluded from 401 interception so failed login shows inline error
- [Phase 16-01]: Optimistic localStorage read before async /auth/me prevents flash of logged-out UI

### Key Audit Findings (v3.0 driver)

- JWT contains stale role with 365-day expiry — privilege escalation vector
- optionalAuth skips is_active DB check — deactivated users treated as authenticated
- No /auth/me endpoint — client trusts localStorage without server validation
- No security headers (helmet) — zero CSP, HSTS, X-Frame-Options
- EmbedPreview dangerouslySetInnerHTML accepts all iframe attributes
- No 401 response interceptor — expired tokens cause silent failures
- Multiple null-safety crashes in PostCard, PostListItem, ArtistPage
- EditPost ownership check races with auth context loading
- RSS feed writes unsanitized embed URLs into content

### Blockers/Concerns

- Spotify credentials still missing from server/.env (not blocking v3.0)
- Turso INSERT OR IGNORE behavior should be validated for likes (known issue #2713)

## Session Continuity

Last session: 2026-03-19
Stopped at: Completed 16-01-PLAN.md (Client Auth Integration) — Phase 16 complete
Resume file: None
