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

## Milestone: v2.1 — Reader Engagement & Editorial

**Shipped:** 2026-03-01
**Phases:** 5 | **Plans:** 10 | **Timeline:** 1 day (~4 hours)

### What Was Built
- Schema safety net: BigInt coercion applied globally + status filtering on all 14 public query sites
- Reader accounts with /join registration, role-aware UI, requireContributor middleware
- Like system with optimistic UI, check-then-act toggle, one-per-reader constraint
- Flat comments with three-way delete auth (comment author, post owner, admin), canDelete in API
- Draft save/preview/publish workflow, post editing with "edited" indicator, My Posts dashboard

### What Worked
- batchLoadPostData helper eliminated N+1 across all 6 post-list endpoints in a single refactor
- requireContributor middleware as positive check (contributor OR admin) was cleaner than negative role exclusion
- Optimistic UI for likes/comments gave instant feedback while server confirmed
- Check-then-act for like toggle avoided Turso INSERT OR IGNORE ambiguity

### What Was Inefficient
- published_at backfill required careful migration ordering — existing posts needed non-null values
- Three separate status-filtering passes (posts, comments, profile) when it could have been a shared query builder

### Patterns Established
- batchLoadPostData pattern: single function loads embed, tags, artists, like counts for an array of post IDs
- requireContributor middleware: positive role check gate on all mutation routes
- Check-then-act for Turso: SELECT then INSERT/DELETE avoids INSERT OR IGNORE ambiguity
- published_at for feed ordering: drafts use NULL, published posts order by publish time not creation

### Key Lessons
1. Turso's INSERT OR IGNORE behavior is inconsistent — check-then-act is more reliable for toggle operations.
2. Batch data loading as a shared helper pays off fast — used by 6 endpoints immediately, extended to single-post in v3.0.
3. Role-based middleware should be positive checks ("is contributor") not negative ("is not reader") — easier to reason about.

### Cost Observations
- Model mix: ~60% sonnet (agents), ~40% opus (orchestration)
- Sessions: 1 (continuous)
- Notable: 5 phases in a single session, auto-advance mode throughout

---

## Milestone: v3.0 — Production Launch

**Shipped:** 2026-03-02
**Phases:** 5 | **Plans:** 6 | **Timeline:** 1 day (~2 hours)

### What Was Built
- Server startup env validation (fail-fast on missing admin seed vars, SMTP warning + graceful 503)
- Vercel API proxy config, robots.txt, and sitemap.xml with placeholder URLs for pre-deploy
- Dynamic OG meta tags via expanded serverless function with crawler-aware UA rewrite
- Security middleware: helmet + CSP (6 embed providers), origin validation, JWT 30d expiry
- Performance: batchLoadPostData on single-post route (8 → 3 queries), cursor pagination on profiles
- UX: styled 404 page, error/retry states on Search and Explore pages

### What Worked
- Infrastructure-focused milestone executed extremely fast — no new schemas, no complex UI, just hardening
- Origin validation over CSRF tokens was the right architectural call for JWT-in-header auth
- Reusing batchLoadPostData for single-post route was a one-line change thanks to v2.1's helper design
- Placeholder URL approach for pre-deploy config was pragmatic — 3 files, obvious pattern

### What Was Inefficient
- Phase verifications all passed first try — could have skipped verification loop for this type of hardening milestone
- CLI `milestone complete` counted phases across all milestones (9 instead of 5) — manual correction needed

### Patterns Established
- validateEnv() at server startup before any DB or route initialization (fail-fast)
- isEmailConfigured() export for graceful degradation of optional services
- Crawler UA rewrite in Vercel config routes bot traffic through serverless OG function
- useCallback-extracted fetch functions enable retry-from-UI without stale closure issues
- Security middleware ordering: securityHeaders before CORS, validateOrigin after CORS

### Key Lessons
1. Hardening milestones are fast — no new features means no design decisions, just applying known patterns.
2. Origin validation is sufficient CSRF defense for JWT-in-Authorization-header APIs — no token dance needed.
3. Placeholder URLs work well for pre-deploy config when the user doesn't have production URLs yet.
4. helmet v8 dropped some headers silently (xXssProtection) — always verify what middleware actually sets.

### Cost Observations
- Model mix: ~60% sonnet (agents), ~40% opus (orchestration)
- Sessions: 1 (continuous)
- Notable: Fastest milestone — 5 phases in ~2 hours, all plans single-wave, zero gap closures needed

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Plans | Key Change |
|-----------|----------|--------|-------|------------|
| v1.0 | ~8 | 5 | 12 | Initial build — established phase/plan/verify cycle |
| v2.0 | 1 | 4 | 7 | Auto-advance mode, UAT-driven gap closure, single-session execution |
| v2.1 | 1 | 5 | 10 | Batch helpers, role-based middleware, optimistic UI patterns |
| v3.0 | 1 | 5 | 6 | Hardening-only milestone — zero gap closures, fastest execution |

### Velocity Trend

| Milestone | Plans | Wall Clock | Plans/Hour |
|-----------|-------|-----------|------------|
| v1.0 | 12 | ~44 days | N/A (intermittent) |
| v2.0 | 7 | ~3 hours | ~2.3 |
| v2.1 | 10 | ~4 hours | ~2.5 |
| v3.0 | 6 | ~2 hours | ~3.0 |

### Top Lessons (Verified Across Milestones)

1. Server-side validation and resolution is more reliable than client-side parsing
2. Visual verification plans catch issues that automated analysis cannot
3. Deployment config should be verified alongside code, not deferred
4. UAT testing catches integration bugs that static verifiers miss (confirmed v1.0 + v2.0)
5. Global fixes at infrastructure layers (db wrapper, embed resolver) eliminate entire bug classes
6. Shared helpers (batchLoadPostData) compound — built in v2.1, extended in v3.0 with zero effort
7. Hardening milestones execute 2-3x faster than feature milestones — no design decisions needed
