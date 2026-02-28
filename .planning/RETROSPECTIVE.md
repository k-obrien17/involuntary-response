# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-02-28
**Phases:** 5 | **Plans:** 12 | **Timeline:** 44 days

### What Was Built
- Invite-only auth with admin dashboard (invite management, contributor accounts, password reset)
- Post creation with inline Spotify + Apple Music embeds via server-side oEmbed resolver
- Text-first reverse-chronological feed with click-to-load embed placeholders and cursor pagination
- Browse by tag, artist, or contributor with Explore hub and profile pages with inline bio editing
- Social sharing (OG meta tags via Vercel serverless), RSS feed, dark mode with system preference detection

### What Worked
- Reusing the Backyard Marquee stack eliminated all setup friction — first code committed on day 1
- Phase-by-phase execution kept scope tight — each phase delivered a verifiable capability
- Server-side oEmbed resolution was a better architecture than the initial client-side parser — caught early and pivoted
- Visual verification plans (03-02) as a separate checkpoint caught layout issues before moving on
- Gap closure plans (04-03) caught field name mismatches and UX issues from user UAT feedback

### What Was Inefficient
- Phase 4 plan 04-02 summary was never generated — execution completed but documentation gap
- Phase 2 VERIFICATION.md staled after embed architecture evolved — references deleted file (embedParser.js)
- ROADMAP.md progress table fell out of sync (Phases 3-5 showed wrong completion status)
- The Explore.jsx `display_name` vs `displayName` mismatch passed through planning and initial execution — caught by verifier

### Patterns Established
- Server-side oEmbed resolution > client-side URL parsing (validation + metadata in one place)
- Click-to-load embed facades in feeds, full iframes on permalinks (performance + engagement balance)
- Composite cursor pagination (created_at, id) for stable feed ordering
- FOUC prevention via inline script before React hydration for dark mode
- Vercel serverless for dynamic OG tags (crawlers don't run JS)

### Key Lessons
1. Embed provider string consistency matters end-to-end — server storage, API response, and client check must use the same string. Caught as a Phase 2 gap after verifier identified the mismatch.
2. Field name conventions (snake_case from DB vs camelCase from API) need explicit mapping in each endpoint — don't assume consistency.
3. Visual verification as a standalone plan (not just automated checks) caught real UX issues that code analysis misses.
4. vercel.json deployment config needs to be verified as part of phase completion, not left as post-milestone debt.

### Cost Observations
- Model mix: ~70% sonnet (agents), ~30% opus (orchestration)
- Sessions: ~8 across 44 days
- Notable: Auto-advance mode and parallel wave execution kept most phases under 10 minutes each

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 5 | Initial build — established phase/plan/verify cycle |

### Top Lessons (Verified Across Milestones)

1. Server-side validation and resolution is more reliable than client-side parsing
2. Visual verification plans catch issues that automated analysis cannot
3. Deployment config should be verified alongside code, not deferred
