# Phase 1: Foundation and Auth - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding, database schema, invite-only contributor auth system, and admin invite/contributor management. Delivers the foundation that all other phases build on: a working Express API, Turso database, React frontend shell, and the complete invite → register → login → session lifecycle. Admin dashboard for invite and contributor management lives within the app at a protected route.

</domain>

<decisions>
## Implementation Decisions

### Invite Flow
- Invite is a clickable URL that opens a registration page with the invite token pre-filled
- Single-use: one invite link = one contributor registration, then it's consumed
- Invite links expire after 7 days if not used
- Admin can optionally attach a note to each invite (e.g., "for Sarah", "music blogger from Brooklyn")
- Admin can revoke unused invites

### Registration
- Registration collects: email, password, display name (3 fields)
- Username is NOT collected at registration — auto-generated or handled separately
- Invite token is pre-filled from the URL, not entered manually

### Session & Security
- Sessions persist until the contributor explicitly logs out (no automatic expiration)
- JWT stored in localStorage (same pattern as Backyard Marquee)
- Password requirements: minimal — 8 character minimum, no complexity rules
- Failed login attempts show a generic "Invalid email or password" message — no lockout
- Password reset via email link (standard forgot-password flow)

### Admin Experience
- Admin dashboard is an in-app protected route (/admin), not a separate app
- Admin sees full invite detail: status (pending/used/expired/revoked), who used it, when created, when used, intended-for note
- Admin can manage contributors: view contributor list, deactivate accounts
- Admin can create invites, view all invites, revoke unused invites

### Contributor Roles
- Two roles only: admin and contributor
- Admin has all contributor powers (can post) plus admin powers (invites, contributor management)
- First admin account seeded on first app startup from environment variables
- Admins can promote other contributors to admin role

### Claude's Discretion
- Database schema design and table structure
- JWT token expiration and refresh strategy (long-lived is fine given "until logout" preference)
- Username generation approach (if auto-generated)
- Password reset email service/implementation
- Admin dashboard UI layout and design
- Rate limiting on auth endpoints
- CORS and security headers configuration

</decisions>

<specifics>
## Specific Ideas

- Same auth patterns as Backyard Marquee where applicable (JWT + bcrypt, token in localStorage, auth middleware)
- Admin seed from env vars means the app is self-bootstrapping — no manual setup steps after deploy
- The invite URL should feel like a personal invitation, not a corporate onboarding form

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-and-auth*
*Context gathered: 2026-02-26*
