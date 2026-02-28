# Requirements: Involuntary Response

**Defined:** 2026-02-28
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## v2.1 Requirements

Requirements for Reader Engagement & Editorial milestone. Each maps to roadmap phases.

### Reader Accounts

- [ ] **ACCT-01**: Reader can sign up with email, display name, and password (no invite required)
- [ ] **ACCT-02**: Reader can log in with existing credentials
- [ ] **ACCT-03**: Auth system distinguishes reader vs contributor roles in JWT and UI

### Likes

- [ ] **LIKE-01**: Reader can like/unlike a post (toggle, one per reader per post)
- [ ] **LIKE-02**: Like count displays on posts in feed and permalink
- [ ] **LIKE-03**: Logged-in reader sees which posts they've already liked

### Comments

- [ ] **CMNT-01**: Reader can post a top-level comment on a post
- [ ] **CMNT-02**: Comments display chronologically on the post permalink
- [ ] **CMNT-03**: Comment author can delete their own comment
- [ ] **CMNT-04**: Post author and admin can delete any comment on the post

### Drafts & Publishing

- [ ] **EDIT-01**: Contributor can save a post as draft (not visible publicly)
- [ ] **EDIT-02**: Contributor can preview a draft before publishing
- [ ] **EDIT-03**: Contributor can publish a draft
- [ ] **EDIT-04**: Contributor can edit a published post (content, embeds, tags)
- [ ] **EDIT-05**: Edited posts show an "edited" indicator

## Future Requirements

Deferred until v2.1 core is working and evaluated.

### Scheduling & Dashboard

- **SCHED-01**: Contributor can schedule a post for future publish date/time
- **SCHED-02**: Scheduled posts auto-publish at the set time
- **DASH-01**: Contributor "My Posts" dashboard with published/draft/scheduled views

### Feed Enhancements

- **FEED-01**: Comment count displays alongside like count in feed cards

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social login (Google/GitHub) for readers | Overkill for small reader base; add later if signup friction measured |
| Reader profile pages | Readers are consumers, not creators; display name on comments suffices |
| Email notifications for engagement | Contributor pool is small enough to check dashboard |
| Comment editing | Delete and re-post; comments are ephemeral reactions |
| Comment threading/replies | Flat comments match the short-form post format |
| Autosave drafts | Posts are ~800 chars; manual save is fine |
| Version history for edits | Too short to warrant revision tracking |
| Magic link auth | Adds email dependency per login; password auth is simpler |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACCT-01 | — | Pending |
| ACCT-02 | — | Pending |
| ACCT-03 | — | Pending |
| LIKE-01 | — | Pending |
| LIKE-02 | — | Pending |
| LIKE-03 | — | Pending |
| CMNT-01 | — | Pending |
| CMNT-02 | — | Pending |
| CMNT-03 | — | Pending |
| CMNT-04 | — | Pending |
| EDIT-01 | — | Pending |
| EDIT-02 | — | Pending |
| EDIT-03 | — | Pending |
| EDIT-04 | — | Pending |
| EDIT-05 | — | Pending |

**Coverage:**
- v2.1 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after initial definition*
