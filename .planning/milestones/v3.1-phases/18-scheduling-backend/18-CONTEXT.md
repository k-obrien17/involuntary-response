# Phase 18: Scheduling Backend - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `scheduled` post status with `scheduled_at` UTC timestamp. Server-side mechanism auto-publishes due posts. Scheduled posts excluded from all public endpoints. No UI changes in this phase.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Publishing mechanism (setInterval vs node-cron vs on-request check — pick simplest for the stack)
- Polling interval (1-5 minutes is fine)
- API design (extend existing create/update endpoint or add new scheduling endpoint)
- Migration approach (new column + status value)
- Status transition rules (what happens if server was down when post was due — publish immediately on next check)
- Whether scheduled_at needs a DB index
- Error handling for the polling mechanism

</decisions>

<specifics>
## Specific Ideas

- Keep it simple — this is a small feature, not a scheduling platform
- The existing draft workflow already has `status` (draft/published) and `published_at` — scheduling should extend that pattern naturally
- Existing `AND p.status = 'published'` filtering on 14 query sites already excludes non-published posts — `scheduled` status should be excluded the same way

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-scheduling-backend*
*Context gathered: 2026-03-19*
