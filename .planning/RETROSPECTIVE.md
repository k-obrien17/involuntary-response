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

## Milestone: v2.0 — Polish & Gaps

**Shipped:** 2026-02-28
**Phases:** 4 | **Plans:** 7 | **Timeline:** 1 day (~3 hours)

### What Was Built
- Vercel API proxy rewrite (`vercel.json`) forwarding `/api/*` to Render backend
- Gravatar avatar system with initials fallback on posts, feeds, and profile pages
- Apple Music artist extraction via iTunes Search API + manual artist name input + source tracking
- BigInt-to-Number coercion in libsql db wrapper (global fix for db.get/db.all)
- RichBody component for inline music URL rendering (Spotify/Apple Music links as styled elements)
- Full-text search API + Search page + Navbar search input (5 search dimensions)

### What Worked
- Auto-advance mode through phases 8 and 9 kept momentum — zero context switches needed
- UAT testing on Phase 7 caught two real bugs (BigInt coercion, missing artist preview) that static verification missed
- Gap closure plan (07-03) fixed both issues in a single wave — diagnose → plan → execute → re-verify
- iTunes Search API choice for Apple Music was excellent — no auth required, reliable results
- Single-day execution of 4 phases (7 plans) with planning + execution + verification

### What Was Inefficient
- Spotify artist extraction untestable in dev because `.env` was missing `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` — not a code issue, but blocked UAT
- ROADMAP.md progress table was stale entering v2.0 (phases 6-7 showed "In Progress"/"Not started" after completion)
- Phase 7 needed 3 plans instead of planned 2 — the third (07-03) was a gap closure plan from UAT

### Patterns Established
- BigInt coercion at db wrapper layer (coerceRow) — fixes all queries globally, not per-route
- Artist extraction priority chain: Spotify > Apple Music > manual fallback
- Client-side text parsing via regex matchAll for inline references — zero backend changes
- Embed resolve endpoint returns artists alongside embed data for live preview
- Search hidden on mobile (`hidden sm:block`) — acceptable for MVP, needs mobile fallback later

### Key Lessons
1. libsql returns INTEGER columns as BigInt — `===` comparisons with plain Numbers fail silently. Global coercion at the db layer is the right fix.
2. UAT testing catches integration bugs that verifiers cannot — verifiers check code wiring, UAT checks actual user flows.
3. Environment variable gaps (missing Spotify credentials) should be caught during phase planning, not during UAT.
4. Auto-advance mode is ideal for small, well-defined phases — phases 8 and 9 each completed in under 3 minutes.

### Cost Observations
- Model mix: ~60% sonnet (agents), ~40% opus (orchestration + UAT)
- Sessions: 1 (continuous)
- Notable: All 4 phases completed in a single session with auto-advance — total wall clock ~3 hours including UAT

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 5 | Initial build — established phase/plan/verify cycle |
| v2.0 | 1 | 4 | Auto-advance mode, UAT-driven gap closure, single-session execution |

### Top Lessons (Verified Across Milestones)

1. Server-side validation and resolution is more reliable than client-side parsing
2. Visual verification plans catch issues that automated analysis cannot
3. Deployment config should be verified alongside code, not deferred
4. UAT testing catches integration bugs that static verifiers miss (confirmed v1.0 + v2.0)
5. Global fixes at infrastructure layers (db wrapper, embed resolver) eliminate entire bug classes
