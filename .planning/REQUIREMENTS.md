# Requirements: Involuntary Response v3.1 Scheduled Posts

**Defined:** 2026-03-19
**Core Value:** Anyone can scroll through and feel the visceral, honest reaction someone had to a piece of music — and the music is right there to listen to.

## v3.1 Requirements

### Scheduling

- [ ] **SCHED-01**: Contributor can set a future date/time when creating or editing a draft post
- [ ] **SCHED-02**: Date/time picker displays in contributor's local timezone, stored as UTC
- [ ] **SCHED-03**: Scheduled posts have status `scheduled` (distinct from `draft` and `published`)
- [ ] **SCHED-04**: Server automatically publishes scheduled posts within a few minutes of their scheduled time
- [ ] **SCHED-05**: Contributor can cancel a scheduled post (reverts to draft)
- [ ] **SCHED-06**: Contributor can edit a scheduled post's content or reschedule its time
- [ ] **SCHED-07**: My Posts dashboard shows scheduled posts with their scheduled date/time
- [ ] **SCHED-08**: Scheduled posts do not appear in public feed until published

## Future Requirements

- Comment author names linked to profile pages
- Mobile nav hamburger menu for admin/contributor links
- Accessibility improvements (aria-labels, keyboard nav)
- Avatar background color contrast fix
- FTS5 migration (when data volume warrants)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Recurring/repeating schedules | Overkill for a music blog — contributors post when inspired |
| Queue-based publishing (auto-space posts) | Small contributor pool, no need for content calendars |
| Email notifications when scheduled post goes live | Email notifications are out of scope for the project |
| Scheduling for readers | Only contributors create posts |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHED-01 | Phase 19 | Pending |
| SCHED-02 | Phase 19 | Pending |
| SCHED-03 | Phase 18 | Pending |
| SCHED-04 | Phase 18 | Pending |
| SCHED-05 | Phase 19 | Pending |
| SCHED-06 | Phase 19 | Pending |
| SCHED-07 | Phase 19 | Pending |
| SCHED-08 | Phase 18 | Pending |

**Coverage:**
- v3.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation*
