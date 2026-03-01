# Requirements: Involuntary Response

**Defined:** 2026-02-28
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music -- and the music is right there to listen to.

## v2.1 Requirements

Requirements for Reader Engagement & Editorial milestone. Each maps to roadmap phases.

### Reader Accounts

- [x] **ACCT-01**: Reader can sign up with email, display name, and password (no invite required)
- [x] **ACCT-02**: Reader can log in with existing credentials
- [x] **ACCT-03**: Auth system distinguishes reader vs contributor roles in JWT and UI

### Likes

- [x] **LIKE-01**: Reader can like/unlike a post (toggle, one per reader per post)
- [x] **LIKE-02**: Like count displays on posts in feed and permalink
- [x] **LIKE-03**: Logged-in reader sees which posts they've already liked

### Comments

- [x] **CMNT-01**: Reader can post a top-level comment on a post
- [x] **CMNT-02**: Comments display chronologically on the post permalink
- [x] **CMNT-03**: Comment author can delete their own comment
- [x] **CMNT-04**: Post author and admin can delete any comment on the post

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
| ACCT-01 | Phase 11 | Complete |
| ACCT-02 | Phase 11 | Complete |
| ACCT-03 | Phase 11 | Complete |
| LIKE-01 | Phase 12 | Complete |
| LIKE-02 | Phase 12 | Complete |
| LIKE-03 | Phase 12 | Complete |
| CMNT-01 | Phase 13 | Complete |
| CMNT-02 | Phase 13 | Complete |
| CMNT-03 | Phase 13 | Complete |
| CMNT-04 | Phase 13 | Complete |
| EDIT-01 | Phase 14 | Pending |
| EDIT-02 | Phase 14 | Pending |
| EDIT-03 | Phase 14 | Pending |
| EDIT-04 | Phase 14 | Pending |
| EDIT-05 | Phase 14 | Pending |

**Coverage:**
- v2.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0
- Infrastructure phase: Phase 10 (Schema & Query Safety) -- no direct requirements, enables all v2.1 phases

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation*
