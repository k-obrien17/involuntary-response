# Phase 11: Reader Accounts - Research

**Researched:** 2026-02-28
**Domain:** Role-based user registration and auth gating for a multi-role Express/React platform
**Confidence:** HIGH

## Summary

Phase 11 adds open reader registration to Involuntary Response, a platform that currently only allows invite-only contributor accounts. The core challenge is not building new auth infrastructure -- the existing JWT/bcrypt/Express auth stack handles everything needed -- but rather surgically adding a new user role without breaking the existing invite-protected contributor flow, and ensuring every UI element and API endpoint correctly distinguishes between readers and contributors.

The existing codebase provides all the building blocks: `generateToken()` already includes `role` in the JWT payload, `requireContributor` middleware already exists in `server/middleware/auth.js` (added in Phase 10 but not yet applied to any route), `ensureUniqueUsername()` handles username generation, and the same bcrypt/email-validation patterns from contributor registration apply directly. The `users` table schema needs no modification -- the `role` column already supports arbitrary text values. The work is primarily integration: a new registration endpoint, a new registration page, role-aware AuthContext, conditional Navbar rendering, a ContributorRoute guard, and applying `requireContributor` to post-mutation endpoints.

The single most dangerous aspect is the `users.role` column default. It is currently `DEFAULT 'contributor'`, which means any code path that inserts a user row without explicitly setting `role` would create a contributor. This default was safe when registration required an invite token, but becomes a security hole the moment open registration exists. The `/register-reader` endpoint must explicitly set `role = 'reader'`, and the implementation must be audited against this default.

**Primary recommendation:** Build a separate `/register-reader` endpoint that mirrors the existing `/register` structure but skips invite validation and inserts `role = 'reader'`. Apply `requireContributor` middleware to all post-mutation routes. Add `isContributor`/`isReader` helpers to AuthContext. Gate the "New post" button and create/edit routes behind contributor role checks.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACCT-01 | Reader can sign up with email, display name, and password (no invite required) | New `/register-reader` endpoint reusing existing bcrypt/JWT/username-generation patterns. Separate from invite flow per Architecture Pattern 1. |
| ACCT-02 | Reader can log in with existing credentials | Existing `/login` endpoint works for all roles -- JWT already contains `role`. No changes needed to login. Token is 365-day expiry, stored in localStorage, so sessions persist across browser restarts. |
| ACCT-03 | Auth system distinguishes reader vs contributor roles in JWT and UI | `requireContributor` middleware exists (Phase 10). AuthContext needs `isContributor`/`isReader` helpers. Navbar, ProtectedRoute, and App.jsx need conditional rendering per Architecture Pattern 2. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express 5 | existing | API server, routing, middleware chaining | Already in use. New endpoint + middleware application only. |
| bcryptjs | existing | Password hashing for reader registration | Already imported in `server/routes/auth.js`. Same hash/compare flow. |
| jsonwebtoken | existing | JWT generation with role in payload | `generateToken()` already includes `role`. No changes needed. |
| express-rate-limit | existing | Rate limiting on new registration endpoint | Already used for contributor registration. Same pattern. |
| React 18 | existing | Reader registration page, AuthContext updates | Already in use. New page + context modifications. |
| React Router 6 | existing | New `/join` route, ContributorRoute guard | Already in use. Additive changes to App.jsx. |
| Tailwind CSS 3 | existing | Styling for reader registration page | Already in use. Copy styling from existing Register.jsx. |
| Axios | existing | API client for reader registration call | Already in use. Add `registerReader` method. |

### Supporting

No new dependencies needed. Everything required for Phase 11 already exists in the project.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `/register-reader` endpoint | Modify existing `/register` with conditional logic | Modifying `/register` risks breaking the invite flow's atomic race condition protection. Separate endpoint is safer and cleaner. |
| `isContributor` helper in AuthContext | Check `user.role` everywhere inline | Inline checks are error-prone and scattered. Centralized helpers ensure consistency. |
| ContributorRoute component | Modify ProtectedRoute to accept role parameter | ProtectedRoute currently means "any authenticated user." Changing its contract risks breaking existing usages. New component is additive. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Changes

```
server/
├── middleware/auth.js              # EXISTING: requireContributor already exported
├── routes/auth.js                  # MODIFIED: add /register-reader endpoint
├── routes/posts.js                 # MODIFIED: add requireContributor to POST, PUT, DELETE
├── routes/embeds.js                # MODIFIED: add requireContributor to POST /resolve
├── routes/profile.js               # MODIFIED: add requireContributor to PUT /me

client/src/
├── context/AuthContext.jsx          # MODIFIED: add registerReader, isContributor, isReader
├── api/client.js                    # MODIFIED: add auth.registerReader method
├── components/Navbar.jsx            # MODIFIED: conditional "New post" / admin links
├── components/ProtectedRoute.jsx    # UNCHANGED (still means "any auth user")
├── components/ContributorRoute.jsx  # NEW: requires contributor or admin role
├── pages/JoinPage.jsx               # NEW: reader signup form
├── App.jsx                          # MODIFIED: add /join route, swap ProtectedRoute for ContributorRoute
```

### Pattern 1: Separate Registration Endpoint

**What:** A new `POST /api/auth/register-reader` endpoint that mirrors `/register` but skips invite token validation and sets `role = 'reader'`.

**When to use:** Whenever adding a new user type with different onboarding requirements to an existing auth system.

**Why this approach:**
The existing `/register` endpoint (lines 54-117 of `server/routes/auth.js`) contains careful invite token validation with atomic race condition protection (`UPDATE ... WHERE used_by IS NULL`). Branching this logic for readers adds complexity to security-critical code. A separate endpoint is cleaner -- each does exactly one thing.

**Example:**
```javascript
// Source: derived from existing server/routes/auth.js /register endpoint
router.post('/register-reader', authLimiter, async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existingEmail = await db.get('SELECT 1 FROM users WHERE email = ?', email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const username = await ensureUniqueUsername(displayName);
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, display_name, username, role) VALUES (?, ?, ?, ?, ?)',
      email, hash, displayName, username, 'reader'
    );

    const user = { id: result.lastInsertRowid, email, displayName, username, role: 'reader' };
    const jwtToken = generateToken(user);
    res.status(201).json({ token: jwtToken, user });
  } catch (err) {
    console.error('Reader registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

### Pattern 2: Role-Based Route Protection

**What:** Apply `requireContributor` middleware to contributor-only endpoints. This middleware already exists in `server/middleware/auth.js` (line 50-55) but is not yet used on any route.

**Where to apply:**

| Route File | Endpoint | Current Auth | New Auth |
|------------|----------|-------------|----------|
| `posts.js` | `POST /` (create) | `authenticateToken` | `authenticateToken, requireContributor` |
| `posts.js` | `PUT /:slug` (update) | `authenticateToken` | `authenticateToken, requireContributor` |
| `posts.js` | `DELETE /:slug` (delete) | `authenticateToken` | `authenticateToken, requireContributor` |
| `embeds.js` | `POST /resolve` | `authenticateToken` | `authenticateToken, requireContributor` |
| `profile.js` | `PUT /me` (bio update) | `authenticateToken` | `authenticateToken, requireContributor` |

**Example:**
```javascript
// Source: existing server/middleware/auth.js line 50-55
import { authenticateToken, requireContributor } from '../middleware/auth.js';

// Chain middleware: authenticate first, then check role
router.post('/', authenticateToken, requireContributor, createLimiter, async (req, res) => {
  // ... only contributors and admins reach here
});
```

**Critical:** `requireContributor` must come AFTER `authenticateToken` in the chain because it reads `req.user.role` which is set by `authenticateToken`.

### Pattern 3: AuthContext Role Helpers

**What:** Add computed role helpers to AuthContext so every component can check user type without string comparison.

**Example:**
```javascript
// Source: derived from existing client/src/context/AuthContext.jsx
const isContributor = user?.role === 'contributor' || user?.role === 'admin';
const isReader = user?.role === 'reader';
const isAdmin = user?.role === 'admin';

const registerReader = async (email, password, displayName) => {
  const res = await auth.registerReader(email, password, displayName);
  return handleAuthResponse(res);
};

return (
  <AuthContext.Provider value={{
    user, loading, login, register, registerReader, logout,
    isContributor, isReader, isAdmin
  }}>
    {children}
  </AuthContext.Provider>
);
```

### Pattern 4: ContributorRoute Guard

**What:** A client-side route guard that requires contributor or admin role, redirecting readers and anonymous users.

**Example:**
```javascript
// Source: derived from existing AdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ContributorRoute({ children }) {
  const { user, loading, isContributor } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isContributor) return <Navigate to="/" replace />;

  return children;
}
```

### Anti-Patterns to Avoid

- **Modifying the existing `/register` endpoint:** The invite flow has atomic race condition protection. Do not add conditional branches for readers. Use a separate endpoint.

- **Relying on the `users.role` column DEFAULT:** The current default is `'contributor'`. The `/register-reader` endpoint MUST explicitly set `role = 'reader'` in the INSERT statement. Never omit the role column from the INSERT and rely on the default.

- **Checking `user.role !== 'reader'` instead of `user.role === 'contributor' || user.role === 'admin'`:** Negative checks break when new roles are added. Positive checks are explicit about who has access.

- **Gating the entire ProtectedRoute by role:** ProtectedRoute currently means "any authenticated user" and is used to redirect unauthenticated users to login. If you change it to require contributor role, readers lose access to password reset and other authenticated-but-not-contributor features. Keep ProtectedRoute as-is, create ContributorRoute as a separate component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Username generation | Custom slug logic | Existing `ensureUniqueUsername()` in `auth.js` | Already handles collisions, truncation, and deduplication |
| Rate limiting | Custom token bucket | Existing `express-rate-limit` with same config pattern | Proven pattern used on 5+ existing endpoints |
| Password hashing | Custom hash function | Existing `bcrypt.hash(password, 10)` pattern | Already in use, cost factor proven |
| JWT generation | Manual token construction | Existing `generateToken(user)` utility | Already includes all needed claims (id, email, role, username) |
| Email validation | Complex regex or library | Existing `isValidEmail()` in `auth.js` | Simple format check sufficient for this app's scale |

**Key insight:** Phase 11 requires zero new libraries because every primitive (hashing, tokens, rate limiting, username generation, email validation) is already built and proven in the existing auth module.

## Common Pitfalls

### Pitfall 1: Contributor Role Default in Schema

**What goes wrong:** The `users` table has `role TEXT NOT NULL DEFAULT 'contributor'`. If the INSERT in `/register-reader` omits the `role` column, the new user silently becomes a contributor.

**Why it happens:** Copy-pasting the existing registration INSERT without examining column defaults. The existing `/register` explicitly sets `'contributor'` in the INSERT, making the default irrelevant -- until reader registration exists.

**How to avoid:** Always explicitly include `role = 'reader'` in the INSERT statement. Write a verification test: register a reader, then attempt `POST /api/posts` with the reader's token and confirm 403.

**Warning signs:** A newly registered reader can see "New post" in the Navbar or successfully create a post.

### Pitfall 2: ProtectedRoute Lets Readers Into Contributor Pages

**What goes wrong:** Currently, `ProtectedRoute` only checks `if (!user)` -- any authenticated user passes. If the existing `/posts/new` route stays wrapped in `ProtectedRoute`, readers can access the create-post page.

**Why it happens:** The distinction between "authenticated" and "authorized" was irrelevant when all users were contributors. Now it matters.

**How to avoid:** Replace `ProtectedRoute` with `ContributorRoute` for contributor-only routes (`/posts/new`, `/posts/:slug/edit`). Keep `ProtectedRoute` for routes that any authenticated user should access (none exist yet, but will in Phase 12 for likes).

**Warning signs:** A logged-in reader navigates to `/posts/new` and sees the post creation form (even though the backend would reject the POST).

### Pitfall 3: Navbar Shows Contributor UI to Readers

**What goes wrong:** The current Navbar (line 103-128) checks `{user ? (<>... New post ...</>) : (...)}`. Any authenticated user sees "New post", admin link, and profile link.

**Why it happens:** The Navbar was built when `user` always meant "contributor or admin."

**How to avoid:** The Navbar must check role, not just authentication. "New post" button should only render for contributors/admins. The admin link already correctly checks `user.role === 'admin'`. Readers should still see their display name and a logout button.

**Warning signs:** A reader logs in and sees a "New post" button in the top navigation.

### Pitfall 4: Login Page Has No Link to Reader Registration

**What goes wrong:** The existing Login page has a "Forgot your password?" link but no signup link for readers. New readers have no way to discover the registration page.

**Why it happens:** The login page was designed when registration required an invite link (sent externally), so no in-app link was needed.

**How to avoid:** Add a "Create an account" link on the Login page that points to the reader registration page. Also add a "Log in" link on the reader registration page. Cross-link both.

**Warning signs:** A visitor on the login page has to manually type the registration URL.

### Pitfall 5: Readers Blocked from Password Reset

**What goes wrong:** The password reset flow (`POST /forgot-password`, `POST /reset-password`) works by email lookup in the `users` table. If the query has a role filter (e.g., `WHERE role = 'contributor'`), readers cannot reset passwords.

**Why it happens:** Defensive coding that inadvertently filters by role.

**How to avoid:** Verify the password reset flow has no role-based filtering. The existing implementation (`auth.js` lines 150-216) queries `SELECT id FROM users WHERE email = ? AND is_active = 1` -- no role filter. This is correct and requires no changes. Just verify it stays this way.

**Warning signs:** A reader who forgot their password never receives a reset email.

### Pitfall 6: Profile Bio Update Open to Readers

**What goes wrong:** The `PUT /users/me` endpoint (profile.js line 59) currently uses `authenticateToken`. If not upgraded to `requireContributor`, readers can set bios -- which is inconsistent since readers have no public profile page.

**Why it happens:** The bio update was built for contributors. Readers were not considered.

**How to avoid:** Add `requireContributor` to `PUT /me`. If readers should eventually have bios, add it in a future phase with a corresponding profile page.

**Warning signs:** A reader successfully updates their bio via API, but it is never displayed anywhere.

## Code Examples

### Reader Registration API Client Method

```javascript
// Source: derived from existing client/src/api/client.js auth object
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, displayName, token) =>
    api.post('/auth/register', { email, password, displayName, token }),
  registerReader: (email, password, displayName) =>
    api.post('/auth/register-reader', { email, password, displayName }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }),
};
```

### Navbar Conditional Rendering

```javascript
// Source: derived from existing client/src/components/Navbar.jsx lines 103-139
{user ? (
  <>
    {isContributor && (
      <Link to="/posts/new" className="bg-gray-900 text-white ...">
        New post
      </Link>
    )}
    {user.role === 'admin' && (
      <Link to="/admin" className="...">Admin</Link>
    )}
    <Link to={`/u/${user.username}`} className="...">
      @{user.username}
    </Link>
    <button onClick={handleLogout} className="...">Log out</button>
  </>
) : (
  <>
    <Link to="/login" className="...">Log in</Link>
    <Link to="/join" className="...">Join</Link>
  </>
)}
```

### App.jsx Route Updates

```javascript
// Source: derived from existing client/src/App.jsx
import ContributorRoute from './components/ContributorRoute';
import JoinPage from './pages/JoinPage';

// In Routes:
<Route path="/join" element={<JoinPage />} />
<Route
  path="/posts/new"
  element={
    <ContributorRoute>
      <CreatePost />
    </ContributorRoute>
  }
/>
<Route
  path="/posts/:slug/edit"
  element={
    <ContributorRoute>
      <EditPost />
    </ContributorRoute>
  }
/>
```

### Rate Limiter for Reader Registration

```javascript
// Source: derived from existing auth.js authLimiter pattern
// Stricter than contributor registration since it is open to the public
const readerRegLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts, try again later' },
});

router.post('/register-reader', readerRegLimiter, async (req, res) => {
  // ...
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-role auth (all users are contributors) | Multi-role auth (reader/contributor/admin) | Phase 11 | Every `if (user)` check in the frontend must be evaluated for role-awareness |
| `ProtectedRoute` = any authenticated user | `ProtectedRoute` (any auth) + `ContributorRoute` (contributor/admin only) | Phase 11 | Route guards now express two levels of authorization |
| `/register` only endpoint (requires invite) | `/register` (invite) + `/register-reader` (open) | Phase 11 | Two registration flows, one login endpoint |
| Navbar login/logout toggle | Navbar with role-conditional contributor UI | Phase 11 | Readers see display name but not "New post" |

**Nothing deprecated:** All existing patterns remain. Phase 11 adds new capabilities alongside existing ones without replacing anything.

## Open Questions

1. **Should the `users.role` column DEFAULT be changed from `'contributor'` to `'reader'`?**
   - What we know: The existing `/register` endpoint explicitly sets `role = 'contributor'`, so changing the default would not break it. The `/register-reader` endpoint explicitly sets `role = 'reader'`. The default is only a safety net.
   - What's unclear: Whether changing the default in a production Turso database requires a migration (SQLite does not support `ALTER COLUMN DEFAULT` -- you would need to create a new table). Since both endpoints set role explicitly, the default is never relied upon.
   - Recommendation: Do NOT change the default. It requires table recreation in SQLite which is high risk for low reward. Both registration endpoints explicitly set the role. Document this as a known quirk.

2. **Should the reader registration page URL be `/join` or `/register/reader`?**
   - What we know: `/register` is taken by the invite-based contributor flow (requires `?token=` param). The existing Register.jsx shows "Invite required" when no token is present.
   - What's unclear: Whether readers should see the "invite required" page when navigating to `/register`.
   - Recommendation: Use `/join` for the reader registration URL. It is shorter, friendlier, and avoids confusion with the invite-based `/register` path. Add a link from the "Invite required" message on `/register` to `/join` as well.

3. **Should the profile page show reader accounts?**
   - What we know: `GET /:username/profile` returns user data + published posts. Readers have no posts. The profile page would show a user with zero posts.
   - What's unclear: Whether an empty profile is confusing or acceptable.
   - Recommendation: For now, do not modify the profile route. Readers who navigate to their profile will see a page with their name and zero posts. This is acceptable -- no code change needed. Reader profiles can be enhanced in a future phase if warranted.

## Sources

### Primary (HIGH confidence)
- `/Users/keithobrien/server/middleware/auth.js` -- `requireContributor` already exists (line 50-55), `generateToken` includes role in JWT (line 42-48)
- `/Users/keithobrien/server/routes/auth.js` -- existing `/register` endpoint structure (lines 54-117), `ensureUniqueUsername` (lines 35-46), `isValidEmail` (lines 49-51), `authLimiter` pattern (lines 11-15)
- `/Users/keithobrien/server/db/index.js` -- `users` table schema with `role TEXT NOT NULL DEFAULT 'contributor'` (line 70), migration runner pattern (lines 110-223)
- `/Users/keithobrien/client/src/context/AuthContext.jsx` -- current AuthContext exposing `user`, `login`, `register`, `logout` (all lines)
- `/Users/keithobrien/client/src/components/Navbar.jsx` -- current user check `{user ? ...}` on line 103, admin check on line 111
- `/Users/keithobrien/client/src/App.jsx` -- current route structure with ProtectedRoute wrapping `/posts/new` and `/posts/:slug/edit`
- `/Users/keithobrien/client/src/components/ProtectedRoute.jsx` -- current auth check (any user, no role check)
- `/Users/keithobrien/client/src/components/AdminRoute.jsx` -- reference pattern for role-based route guard
- `/Users/keithobrien/client/src/api/client.js` -- current `auth` object structure
- `/Users/keithobrien/server/routes/posts.js` -- `authenticateToken` on POST/PUT/DELETE (lines 148, 268, 324)
- `/Users/keithobrien/server/routes/profile.js` -- `authenticateToken` on PUT /me (line 59)
- `/Users/keithobrien/server/routes/embeds.js` -- `authenticateToken` on POST /resolve (line 17)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- role-based access pattern design, reader registration flow, Navbar conditional rendering
- `.planning/research/FEATURES.md` -- reader signup as table stake feature, competitor analysis showing email+password as standard
- `.planning/research/SUMMARY.md` -- confirmed reader registration uses separate `/register-reader` endpoint

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, entirely existing libraries and patterns
- Architecture: HIGH -- every integration point identified by direct codebase review, 12 files audited
- Pitfalls: HIGH -- all 6 pitfalls derived from actual code review (column defaults, conditional checks, route guards)

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable -- no external dependency changes expected)
