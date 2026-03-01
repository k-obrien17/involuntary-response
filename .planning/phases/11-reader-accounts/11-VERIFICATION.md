---
phase: 11-reader-accounts
verified: 2026-03-01T05:10:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 11: Reader Accounts Verification Report

**Phase Goal:** Anyone can create a reader account and the system correctly distinguishes readers from contributors everywhere
**Verified:** 2026-03-01T05:10:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A new visitor can sign up with email, display name, and password without an invite code | VERIFIED | `POST /api/auth/register-reader` at `server/routes/auth.js:127` accepts `{ email, password, displayName }` with no invite token. JoinPage.jsx (133 lines) provides full registration form calling `registerReader()`. Route `/join` wired in App.jsx:33. |
| 2 | A reader can log in with their credentials and stay logged in across browser sessions | VERIFIED | Existing `POST /api/auth/login` (`server/routes/auth.js:167`) queries by email with no role filter, returns `role: user.role`. JWT is 365-day expiry (`middleware/auth.js:46`), stored in localStorage (`AuthContext.jsx:25`). No changes needed or made to login. |
| 3 | A logged-in reader sees their display name in the Navbar but does NOT see contributor-only UI (create post, drafts) | VERIFIED | `Navbar.jsx:46` destructures `isContributor` from `useAuth()`. Line 105: `{isContributor && (<Link to="/posts/new"...>New post</Link>)}`. Reader still sees `@{user.username}` (line 125) and `Log out` (line 128). |
| 4 | A reader's JWT produces 403 (not 201) when hitting POST /api/posts | VERIFIED | `posts.js:148`: `router.post('/', authenticateToken, requireContributor, ...)`. `requireContributor` (`middleware/auth.js:50-54`) checks `req.user.role !== 'contributor' && req.user.role !== 'admin'` and returns 403. Also applied to PUT (`posts.js:268`), DELETE (`posts.js:324`), POST /embeds/resolve (`embeds.js:17`), PUT /users/me (`profile.js:59`). |
| 5 | Existing contributor accounts and the invite flow work exactly as before | VERIFIED | Original `POST /api/auth/register` (`auth.js:54-117`) is completely unchanged -- still requires `token` param, validates invite, uses atomic race condition protection, inserts `role: 'contributor'`. Login unchanged. New `/register-reader` is a separate endpoint added after line 117. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/routes/auth.js` | POST /api/auth/register-reader endpoint | VERIFIED | Lines 119-164. Validates email/password/displayName, checks email uniqueness, hashes with bcrypt, inserts with explicit `role='reader'`, returns JWT via `generateToken()`. Dedicated rate limiter (5/15min). |
| `server/routes/posts.js` | requireContributor on POST, PUT, DELETE | VERIFIED | Lines 4, 148, 268, 324. Import and usage on all 3 mutation endpoints. Middleware order: authenticateToken -> requireContributor -> rateLimiter -> handler. |
| `server/routes/embeds.js` | requireContributor on POST /resolve | VERIFIED | Lines 3, 17. Import and usage correct. |
| `server/routes/profile.js` | requireContributor on PUT /me | VERIFIED | Lines 3, 59. Import and usage correct. |
| `client/src/pages/JoinPage.jsx` | Reader registration form page | VERIFIED | 133 lines. Full form with displayName, email, password, confirmPassword fields. Client-side validation (password >= 8, passwords match). Calls `registerReader()` from AuthContext. Redirects to `/` on success. Dark mode classes on all elements. "Already have an account? Log in" link to /login. |
| `client/src/components/ContributorRoute.jsx` | Route guard requiring contributor or admin role | VERIFIED | 21 lines. Uses `isContributor` from AuthContext. Redirects unauthenticated to /login, non-contributors to /. Follows AdminRoute.jsx pattern. |
| `client/src/context/AuthContext.jsx` | registerReader function, isContributor/isReader/isAdmin helpers | VERIFIED | `registerReader` at lines 41-44 calls `auth.registerReader()` and pipes through `handleAuthResponse`. Role booleans at lines 52-54. All exported via Provider value at lines 57-59. |
| `client/src/api/client.js` | auth.registerReader API method | VERIFIED | Lines 19-20: `registerReader: (email, password, displayName) => api.post('/auth/register-reader', { email, password, displayName })`. |
| `client/src/App.jsx` | /join route, ContributorRoute on /posts/new and /posts/:slug/edit | VERIFIED | Line 5: imports ContributorRoute. Line 22: imports JoinPage. Line 33: `/join` route. Lines 61-66: `/posts/new` wrapped in ContributorRoute. Lines 73-79: `/posts/:slug/edit` wrapped in ContributorRoute. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| JoinPage.jsx | AuthContext.jsx | `useAuth().registerReader` call | WIRED | JoinPage.jsx:12 destructures `registerReader` from `useAuth()`. Line 31: `await registerReader(email, password, displayName)`. |
| AuthContext.jsx | client.js | `auth.registerReader` API call | WIRED | AuthContext.jsx:2 imports `auth` from `../api/client`. Line 42: `auth.registerReader(email, password, displayName)`. |
| client.js | server auth.js | POST /auth/register-reader | WIRED | client.js:20: `api.post('/auth/register-reader', ...)`. Server auth.js:127: `router.post('/register-reader', ...)`. |
| App.jsx | ContributorRoute.jsx | ContributorRoute wrapping /posts/new and /posts/:slug/edit | WIRED | App.jsx:5 imports ContributorRoute. Lines 63, 76: wraps CreatePost and EditPost. |
| Navbar.jsx | AuthContext.jsx | isContributor check for New post button | WIRED | Navbar.jsx:46: `const { user, logout, isContributor } = useAuth()`. Line 105: `{isContributor && (<Link to="/posts/new"...>)}`. |
| server auth.js /register-reader | middleware/auth.js generateToken | generateToken(user) call with role='reader' | WIRED | auth.js:6 imports `generateToken`. Line 157: user object has `role: 'reader'`. Line 158: `generateToken(user)` encodes role into JWT (middleware/auth.js:44 includes `role: user.role`). |
| posts.js | middleware/auth.js requireContributor | middleware chain: authenticateToken, requireContributor | WIRED | posts.js:4 imports both. Line 148: `authenticateToken, requireContributor` in chain. Same pattern on lines 268, 324. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ACCT-01 | 11-01, 11-02 | Reader can sign up with email, display name, and password (no invite required) | SATISFIED | Backend: `/register-reader` endpoint (auth.js:127-164). Frontend: JoinPage.jsx with full form, `/join` route in App.jsx. |
| ACCT-02 | 11-01 | Reader can log in with existing credentials | SATISFIED | Existing `/login` endpoint (auth.js:167-194) returns `role: user.role` from DB. No role filter on query. JWT 365-day expiry persists sessions. No code changes needed. |
| ACCT-03 | 11-02 | Auth system distinguishes reader vs contributor roles in JWT and UI | SATISFIED | JWT includes `role` (middleware/auth.js:44). `requireContributor` blocks readers on 5 endpoints. Navbar conditionally shows "New post" via `isContributor`. ContributorRoute guards /posts/new and /posts/:slug/edit. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| ContributorRoute.jsx | 8 | `return null` | Info | Intentional -- renders nothing during loading state (same pattern as AdminRoute.jsx). Not a stub. |

No TODOs, FIXMEs, placeholders, or stub implementations found across any of the 12 modified files.

### Human Verification Required

### 1. Reader Signup Flow

**Test:** Visit /join, fill in display name, email, password, confirm password. Submit.
**Expected:** Redirected to home feed. Navbar shows @username and "Log out" but NOT "New post". Token persists across browser refresh.
**Why human:** Visual rendering, redirect behavior, and localStorage persistence require browser interaction.

### 2. Reader Route Guard

**Test:** As a logged-in reader, navigate to /posts/new and /posts/:slug/edit directly via URL bar.
**Expected:** Immediately redirected to / (home). Create/edit form never renders.
**Why human:** Client-side redirect timing and flash-of-content require visual confirmation.

### 3. Cross-Link Navigation

**Test:** Visit /login and confirm "New here? Create an account" links to /join. Visit /register (no token) and confirm "Or create a reader account" links to /join. Visit /join and confirm "Already have an account? Log in" links to /login.
**Expected:** All three cross-links work and navigate correctly.
**Why human:** Link visibility and navigation flow require visual confirmation.

### 4. Logged-Out Navbar

**Test:** Visit site without logging in.
**Expected:** Navbar shows "Log in" (text link) and "Join" (primary button). No "New post" button.
**Why human:** Visual appearance and button styling require browser rendering.

### 5. Contributor Flow Unchanged

**Test:** Register a new contributor using an invite link (/register?token=...). Create a post. Edit the post. Delete the post.
**Expected:** Full contributor CRUD works exactly as before Phase 11.
**Why human:** End-to-end contributor flow requires real invite token and server interaction.

### Gaps Summary

No gaps found. All 5 observable truths verified. All 9 artifacts exist, are substantive, and are correctly wired. All 7 key links confirmed. All 3 requirements (ACCT-01, ACCT-02, ACCT-03) satisfied. No orphaned requirements. Build compiles cleanly (123 modules, zero errors). All 4 commits verified in git log (d9dcff0, a98f02c, 23ed63d, cb26f01).

Critical security check passed: The `/register-reader` endpoint explicitly inserts `role = 'reader'` (auth.js:154), NOT relying on the column DEFAULT which is `'contributor'`. The password reset flow (auth.js:196-263) has no role filter, so readers can reset passwords.

---

_Verified: 2026-03-01T05:10:00Z_
_Verifier: Claude (gsd-verifier)_
