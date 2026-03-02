---
phase: 15-deployment-wiring
verified: 2026-03-01T21:00:00Z
status: gaps_found
score: 3/4 must-haves verified
re_verification: false
gaps:
  - truth: "Vercel API proxy routes resolve to the actual Render backend (not a placeholder URL)"
    status: partial
    reason: "The old literal RENDER_BACKEND_URL token was replaced, but the new value YOUR-APP.onrender.com is itself a placeholder. The user acknowledged they have no Render URL yet and chose a find-and-replace placeholder instead. The proxy does NOT point to a real backend. This satisfies the 'old token replaced' criterion but fails the 'not a placeholder URL' truth from the ROADMAP success criteria."
    artifacts:
      - path: "client/vercel.json"
        issue: "Destination is https://YOUR-APP.onrender.com/api/:path* — a placeholder string, not a real backend URL. robots.txt and sitemap.xml also contain YOURDOMAIN.com placeholder."
    missing:
      - "Replace YOUR-APP.onrender.com with actual Render backend hostname in client/vercel.json"
      - "Replace YOURDOMAIN.com in client/public/robots.txt Sitemap directive with actual production domain"
      - "Replace YOURDOMAIN.com in all <loc> entries in client/public/sitemap.xml with actual production domain"
      - "These three files must be updated before any production deploy will function correctly"
human_verification:
  - test: "Visit /robots.txt on production domain"
    expected: "Returns text/plain with User-agent, Allow, Disallow, and Sitemap directives — Sitemap URL points to actual domain"
    why_human: "Cannot confirm serving until deployed; placeholder domain means Sitemap line is incorrect in current state"
  - test: "Visit /sitemap.xml on production domain"
    expected: "Returns valid XML sitemap with 4 <url> entries using the real production domain"
    why_human: "All <loc> values currently contain YOURDOMAIN.com placeholder"
  - test: "Make an API request through the Vercel proxy"
    expected: "Request is forwarded to the Render backend and a real response is returned"
    why_human: "Cannot verify network routing without a deployed Render backend at the configured hostname"
---

# Phase 15: Deployment Wiring Verification Report

**Phase Goal:** Production environment is correctly configured and validates its own health on startup
**Verified:** 2026-03-01T21:00:00Z
**Status:** gaps_found — 1 of 4 truths fails on real-URL criterion
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Vercel API proxy routes resolve to the actual Render backend (not a placeholder URL) | PARTIAL | Old RENDER_BACKEND_URL token replaced; new value YOUR-APP.onrender.com is still a placeholder. Satisfies "old token gone" but not "real URL". |
| 2 | Server startup fails with a clear error message if ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_DISPLAY_NAME env vars are missing | VERIFIED | validateEnv() in server/index.js (lines 47-57) checks all three, throws with exact missing-var list. Called at line 59 before initDatabase() at line 62. |
| 3 | Server startup logs a warning and password reset endpoint returns a user-facing error if SMTP env vars are missing | VERIFIED | SMTP warning logged in validateEnv() (line 54-56). isEmailConfigured() exported from email.js (line 19-21). auth.js imports it (line 7) and returns 503 before 200 (lines 201-203). |
| 4 | Visiting /robots.txt returns a valid robots file and /sitemap.xml returns a valid sitemap listing public routes | VERIFIED (structurally) | robots.txt exists with correct directives. sitemap.xml is valid XML with 4 url entries (/, /explore, /search, /join). Placeholder domain values do not affect structure validity, only content correctness in production. |

**Score:** 3/4 truths verified (Truth 1 fails on real-URL criterion; Truths 2, 3, 4 pass)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/index.js` | validateEnv() with admin var checks and SMTP warning | VERIFIED | Lines 47-57: checks ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME; warns on missing SMTP_HOST. Called at line 59 before initDatabase(). |
| `server/db/index.js` | seedAdmin() without early-return guard | VERIFIED | Old `if (!adminEmail \|\| !adminPassword) return` guard is absent. Comment at line 41 correctly notes validation moved to server/index.js. Vars read directly from process.env (lines 42-44). |
| `server/lib/email.js` | Exports isEmailConfigured() | VERIFIED | Lines 19-21: `export function isEmailConfigured() { return !!transporter; }`. sendResetEmail unchanged. |
| `server/routes/auth.js` | 503 early return in forgot-password when SMTP unavailable | VERIFIED | Lines 200-203: isEmailConfigured() check before 200 response. Returns 503 with generic message that does not reveal infrastructure details. |
| `client/vercel.json` | API proxy rewrite with real Render backend URL | PARTIAL | RENDER_BACKEND_URL literal replaced. New destination https://YOUR-APP.onrender.com/api/:path* is still a placeholder. |
| `client/public/robots.txt` | Valid robots file with crawl directives and Sitemap reference | VERIFIED (structural) | User-agent, Allow, Disallow /admin, Disallow /api/ all present. Sitemap directive present but points to YOURDOMAIN.com placeholder. |
| `client/public/sitemap.xml` | Valid XML sitemap with 4 public route entries | VERIFIED (structural) | xmlns correct, 4 url entries for /, /explore, /search, /join. All loc values use YOURDOMAIN.com placeholder. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| server/index.js | server/db/index.js | validateEnv() runs at line 59, initDatabase() runs at line 62 | WIRED | Execution order guaranteed — env validated before DB init. |
| server/routes/auth.js | server/lib/email.js | isEmailConfigured import at line 7, used at line 201 | WIRED | Import confirmed at line 7: `import { sendResetEmail, isEmailConfigured } from '../lib/email.js'`. Used at line 201 inside handler. |
| client/vercel.json | Render backend | Hardcoded URL in rewrite destination | NOT_WIRED | Destination contains placeholder hostname YOUR-APP.onrender.com — cannot route to real backend until replaced. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DEPLOY-01 | 15-02-PLAN.md | Vercel API proxy routes to actual Render backend URL | PARTIAL | Old literal replaced; new value is still a placeholder hostname. Wiring cannot function until real URL is set. |
| DEPLOY-02 | 15-01-PLAN.md | Admin seed account env vars validated on startup with clear error messages | SATISFIED | validateEnv() throws with list of missing var names. Process exits on unhandled rejection. |
| DEPLOY-03 | 15-01-PLAN.md | SMTP configuration validated on startup; password reset returns error if email unavailable | SATISFIED | Warning logged at startup. 503 returned from /forgot-password when isEmailConfigured() is false. |
| DEPLOY-04 | 15-02-PLAN.md | robots.txt and sitemap.xml served from public directory | SATISFIED (structural) | Both files exist in client/public/. Structures are valid. Content placeholder values (YOURDOMAIN.com) do not block the file-serving requirement itself but do impair SEO utility. |

No orphaned requirements found — all four DEPLOY IDs appear in plan frontmatter and REQUIREMENTS.md traceability table.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `client/vercel.json` | 4 | `YOUR-APP.onrender.com` placeholder hostname | Blocker | API proxy cannot forward requests to a real backend until replaced. Every `/api/*` call from the deployed frontend will fail. |
| `client/public/robots.txt` | 7 | `YOURDOMAIN.com` placeholder | Warning | Sitemap directive points to wrong domain; crawlers follow an invalid URL. |
| `client/public/sitemap.xml` | 4, 10, 16, 22 | `YOURDOMAIN.com` in all `<loc>` entries | Warning | All sitemap URLs are non-functional until production domain is substituted. |

---

### Human Verification Required

#### 1. Vercel proxy routing to Render backend

**Test:** After replacing `YOUR-APP.onrender.com` in vercel.json with the real Render hostname and deploying, make an API call (e.g., GET /api/health) through the production Vercel domain.
**Expected:** 200 response with `{ "status": "ok", "timestamp": "..." }` forwarded from the Render backend.
**Why human:** Cannot verify network routing without a live Render deployment at the configured hostname.

#### 2. robots.txt serves correct Sitemap URL on production domain

**Test:** Visit `https://<production-domain>/robots.txt` in a browser after updating the domain placeholders.
**Expected:** Returns plain text with `Sitemap: https://<production-domain>/sitemap.xml` matching the actual domain.
**Why human:** Placeholder domain means the Sitemap line is currently wrong; correction must be confirmed after real domain is known.

#### 3. sitemap.xml serves real URLs on production domain

**Test:** Visit `https://<production-domain>/sitemap.xml` after updating YOURDOMAIN.com placeholders.
**Expected:** Valid XML with 4 `<url>` entries whose `<loc>` values use the real production domain.
**Why human:** All loc values currently contain YOURDOMAIN.com.

---

### Gaps Summary

Phase 15 achieved 3 of 4 observable truths. The server-side validation work (Truths 2 and 3) is complete and substantive: `validateEnv()` enforces fail-fast startup for admin env vars, `isEmailConfigured()` is correctly exported and consumed in the forgot-password route, and the 503 path is properly wired before the 200 path.

The SEO files (Truth 4) are structurally valid and will serve correctly once deployed — the placeholder domain values are a content issue, not a structural or wiring failure.

The single gap (Truth 1 / DEPLOY-01) is that `client/vercel.json` still contains a placeholder hostname (`YOUR-APP.onrender.com`) that was chosen intentionally because the user does not yet have a Render deployment. The phase PLAN's `must_haves.artifacts` listed `contains: "onrender.com"` as the criterion, which the placeholder technically satisfies. However, the ROADMAP success criterion states the proxy must resolve to "the actual Render backend (not a placeholder URL)" — the current value does not meet that bar.

Before any production deployment, three files require find-and-replace substitution:
- `client/vercel.json`: Replace `YOUR-APP.onrender.com` with actual Render hostname
- `client/public/robots.txt`: Replace `YOURDOMAIN.com` with actual production domain
- `client/public/sitemap.xml`: Replace all `YOURDOMAIN.com` occurrences with actual production domain

The gap is a documentation/configuration gap, not a logic or wiring gap. The mechanism is correct; only the values are placeholders.

---

_Verified: 2026-03-01T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
