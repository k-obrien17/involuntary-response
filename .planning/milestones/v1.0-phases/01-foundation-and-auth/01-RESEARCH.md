# Phase 1: Foundation and Auth - Research

**Researched:** 2026-02-26
**Domain:** Project scaffolding, invite-only auth, admin management (Express + React + Turso)
**Confidence:** HIGH

## Summary

Phase 1 builds the entire foundation for Involuntary Response: a fresh Express 5 API with Turso database, a React 18 + Vite frontend shell, and a complete invite-only authentication system with admin management. The existing Backyard Marquee codebase in this repo provides proven patterns for JWT auth, bcrypt password hashing, rate limiting, Turso database access, Axios API client, and React AuthContext -- all of which should be adapted (not copied wholesale) for the new app's distinct schema and requirements.

The key differences from Backyard Marquee are: (1) invite-only registration instead of open registration, requiring an `invite_tokens` table and invite validation flow, (2) role-based access with admin/contributor roles instead of flat user accounts, (3) admin dashboard as an in-app protected route, (4) admin seed from environment variables for self-bootstrapping, and (5) password reset via email link. The existing codebase is the primary reference implementation for patterns, but the schema, routes, and components are all new.

**Primary recommendation:** Adapt Backyard Marquee's proven JWT + bcrypt + Turso patterns with fresh schema tables (users with roles, invite_tokens), add role-based middleware (requireAdmin), and build the admin dashboard as a protected `/admin` route. Use `crypto.randomUUID()` for invite tokens and nodemailer for password reset emails.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Invite is a clickable URL that opens a registration page with the invite token pre-filled
- Single-use: one invite link = one contributor registration, then it's consumed
- Invite links expire after 7 days if not used
- Admin can optionally attach a note to each invite (e.g., "for Sarah", "music blogger from Brooklyn")
- Admin can revoke unused invites
- Registration collects: email, password, display name (3 fields)
- Username is NOT collected at registration -- auto-generated or handled separately
- Invite token is pre-filled from the URL, not entered manually
- Sessions persist until the contributor explicitly logs out (no automatic expiration)
- JWT stored in localStorage (same pattern as Backyard Marquee)
- Password requirements: minimal -- 8 character minimum, no complexity rules
- Failed login attempts show a generic "Invalid email or password" message -- no lockout
- Password reset via email link (standard forgot-password flow)
- Admin dashboard is an in-app protected route (/admin), not a separate app
- Admin sees full invite detail: status (pending/used/expired/revoked), who used it, when created, when used, intended-for note
- Admin can manage contributors: view contributor list, deactivate accounts
- Admin can create invites, view all invites, revoke unused invites
- Two roles only: admin and contributor
- Admin has all contributor powers (can post) plus admin powers (invites, contributor management)
- First admin account seeded on first app startup from environment variables
- Admins can promote other contributors to admin role

### Claude's Discretion
- Database schema design and table structure
- JWT token expiration and refresh strategy (long-lived is fine given "until logout" preference)
- Username generation approach (if auto-generated)
- Password reset email service/implementation
- Admin dashboard UI layout and design
- Rate limiting on auth endpoints
- CORS and security headers configuration

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Admin can generate invite links with unique tokens | Invite token schema, `crypto.randomUUID()` for token generation, admin-only API route, invite management patterns |
| AUTH-02 | Contributor can register using an invite token with email and password | Invite validation flow, registration endpoint with token consumption, bcrypt password hashing, JWT generation |
| AUTH-03 | Contributor can log in with email and password | Login endpoint pattern from Backyard Marquee, bcrypt compare, JWT generation, generic error messages |
| AUTH-04 | Contributor session persists across browser refresh | localStorage JWT + AuthContext hydration pattern from Backyard Marquee, long-lived token strategy |
| AUTH-05 | Contributor can log out from any page | AuthContext logout function clearing localStorage, Navbar with logout available on all routes |
| AUTH-06 | Admin can view and manage active invite tokens via web dashboard | Protected /admin route, admin middleware, invite CRUD API endpoints, role-based UI rendering |
| PROF-01 | Contributor has a display name and username | Users table schema with display_name and username columns, auto-generated username approach |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^5.1.0 | HTTP server, routing, middleware | Stable since v5.1.0 (tagged latest on npm). Already used in Backyard Marquee. Express 5 has native async error handling. |
| @libsql/client | ^0.17.0 | Turso (hosted SQLite) database driver | Same driver used in Backyard Marquee. Current latest is 0.17.0. |
| jsonwebtoken | ^9.0.2 | JWT creation and verification | Industry standard for JWT in Node.js. Same version used in Backyard Marquee. |
| bcryptjs | ^3.0.3 | Password hashing | Pure JS bcrypt (no native deps). Same version in Backyard Marquee. |
| cors | ^2.8.5 | CORS headers middleware | Same as Backyard Marquee. |
| dotenv | ^16.4.7 | Environment variable loading | Same as Backyard Marquee. |
| express-rate-limit | ^8.2.1 | Auth endpoint rate limiting | Same as Backyard Marquee. Prevents brute force. |
| react | ^18.3.1 | Frontend UI framework | Same as Backyard Marquee. |
| react-dom | ^18.3.1 | React DOM rendering | Paired with React 18. |
| react-router-dom | ^6.28.0 | Client-side routing | Same as Backyard Marquee. Provides protected route patterns. |
| axios | ^1.7.7 | HTTP client with interceptors | Same as Backyard Marquee. Auth token injection via interceptor. |
| vite | ^5.4.10 | Build tool and dev server | Same as Backyard Marquee. Fast HMR, proxy for /api. |
| tailwindcss | ^3.4.14 | Utility-first CSS | Same as Backyard Marquee. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nodemailer | ^8.0.1 | Email sending for password reset | Password reset flow. Latest version published Feb 2026. |
| @vitejs/plugin-react | ^4.3.3 | Vite React plugin | Required for JSX transform in Vite. |
| autoprefixer | ^10.4.20 | PostCSS autoprefixer | Required by Tailwind CSS setup. |
| postcss | ^8.4.47 | CSS processing | Required by Tailwind CSS setup. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nodemailer | Resend API | Resend is simpler (REST API, no SMTP config) but adds a third-party dependency and requires account setup. Nodemailer is more flexible and works with any SMTP provider including Gmail for dev. |
| crypto.randomUUID() | nanoid / uuid package | Native crypto.randomUUID() requires no dependency, generates RFC 4122 v4 UUIDs, available in Node.js 14.17+. No reason to add a package. |
| localStorage JWT | httpOnly cookies | User explicitly chose localStorage (same as Backyard Marquee). HttpOnly cookies are more secure against XSS but add CSRF complexity. Locked decision. |

**Installation (server):**
```bash
cd server
npm install express@^5.1.0 @libsql/client@^0.17.0 jsonwebtoken@^9.0.2 bcryptjs@^3.0.3 cors@^2.8.5 dotenv@^16.4.7 express-rate-limit@^8.2.1 nodemailer@^8.0.1
```

**Installation (client):**
```bash
cd client
npm install react@^18.3.1 react-dom@^18.3.1 react-router-dom@^6.28.0 axios@^1.7.7
npm install -D vite@^5.4.10 @vitejs/plugin-react@^4.3.3 tailwindcss@^3.4.14 autoprefixer@^10.4.20 postcss@^8.4.47
```

## Architecture Patterns

### Recommended Project Structure

This is a NEW app that replaces Backyard Marquee's code. The same monorepo structure applies but with fresh files.

```
client/
├── index.html              # Entry HTML
├── package.json            # Client dependencies
├── vite.config.js          # Vite + proxy config
├── tailwind.config.js      # Tailwind config
├── postcss.config.js       # PostCSS config
└── src/
    ├── App.jsx             # Router setup with protected routes
    ├── main.jsx            # React entry point
    ├── index.css           # Tailwind imports
    ├── api/
    │   └── client.js       # Axios instance + auth interceptor + API methods
    ├── context/
    │   └── AuthContext.jsx  # Auth state, login/register/logout functions
    ├── components/
    │   ├── Navbar.jsx       # Site nav with auth-aware actions
    │   ├── ProtectedRoute.jsx    # Redirects unauthenticated users to /login
    │   └── AdminRoute.jsx        # Redirects non-admin users
    └── pages/
        ├── Home.jsx         # Landing/placeholder (not the feed yet)
        ├── Login.jsx        # Email + password login form
        ├── Register.jsx     # Invite-gated registration form
        ├── ForgotPassword.jsx    # Request password reset email
        ├── ResetPassword.jsx     # Set new password (from email link)
        └── admin/
            ├── Dashboard.jsx     # Admin overview
            ├── Invites.jsx       # Create/view/revoke invites
            └── Contributors.jsx  # View/deactivate/promote contributors

server/
├── index.js                # Express app setup, CORS, routes, error handler
├── package.json            # Server dependencies
├── db/
│   └── index.js            # Turso client, schema init, migration runner
├── middleware/
│   ├── auth.js             # JWT verify, optional/required auth, generateToken
│   └── admin.js            # requireAdmin middleware (checks role)
└── routes/
    ├── auth.js             # Register (with invite), login, forgot/reset password
    ├── invites.js          # Admin invite CRUD (create, list, revoke)
    └── users.js            # Admin contributor management (list, deactivate, promote)
```

### Pattern 1: Invite-Gated Registration Flow
**What:** Registration requires a valid, unused invite token. The invite URL pre-fills the token on the registration page.
**When to use:** Every new contributor registration.
**Flow:**
1. Admin creates invite -> API generates UUID token, stores in `invite_tokens` table
2. Admin copies invite URL: `{FRONTEND_URL}/register?token={uuid}`
3. Contributor clicks link -> Register page reads `token` from URL query params
4. On submit: `POST /api/auth/register` with `{ email, password, displayName, token }`
5. Server validates token (exists, not used, not expired, not revoked), creates user, marks token as used
6. Server returns JWT + user object
**Example:**
```javascript
// server/routes/auth.js - Register endpoint
router.post('/register', authLimiter, async (req, res) => {
  const { email, password, displayName, token } = req.body;

  if (!email || !password || !displayName || !token) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Validate invite token
    const invite = await db.get(
      'SELECT * FROM invite_tokens WHERE token = ? AND used_by IS NULL AND revoked_at IS NULL',
      token
    );
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }
    // Check expiry (7 days)
    const created = new Date(invite.created_at);
    const now = new Date();
    if (now - created > 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'This invite has expired' });
    }

    // Check email uniqueness
    const existing = await db.get('SELECT 1 FROM users WHERE email = ?', email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate username from display name
    const username = generateUsername(displayName);

    // Create user
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, display_name, username, role) VALUES (?, ?, ?, ?, ?)',
      email, hash, displayName, username, 'contributor'
    );

    // Mark invite as used
    await db.run(
      'UPDATE invite_tokens SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?',
      result.lastInsertRowid, invite.id
    );

    const user = { id: result.lastInsertRowid, email, displayName, username, role: 'contributor' };
    const jwtToken = generateToken(user);
    res.status(201).json({ token: jwtToken, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

### Pattern 2: Role-Based Middleware
**What:** Middleware that checks if the authenticated user has admin role before allowing access to admin routes.
**When to use:** All /api/invites and /api/users/admin routes.
**Example:**
```javascript
// server/middleware/admin.js
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Usage in routes:
// router.post('/invites', authenticateToken, requireAdmin, async (req, res) => { ... });
```

### Pattern 3: Admin Seed on Startup
**What:** First admin account created automatically from environment variables on first database init.
**When to use:** App startup when no admin exists.
**Example:**
```javascript
// In server/db/index.js or called from initDatabase
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';

  if (!adminEmail || !adminPassword) {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD set, skipping admin seed');
    return;
  }

  const existing = await db.get('SELECT 1 FROM users WHERE role = ?', 'admin');
  if (existing) return; // Admin already exists

  const hash = await bcrypt.hash(adminPassword, 10);
  const username = 'admin';
  await db.run(
    'INSERT INTO users (email, password_hash, display_name, username, role) VALUES (?, ?, ?, ?, ?)',
    adminEmail, hash, adminDisplayName, username, 'admin'
  );
  console.log('Admin account seeded');
}
```

### Pattern 4: Protected Route Components (Frontend)
**What:** React Router wrapper components that redirect based on auth state.
**When to use:** Any route that requires authentication or admin role.
**Example:**
```jsx
// client/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // or a spinner
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// client/src/components/AdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// Usage in App.jsx:
// <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
```

### Pattern 5: Long-Lived JWT with Role in Payload
**What:** JWT that does not expire (or expires after a very long period like 365 days) to satisfy the "until logout" requirement. User role is included in the token payload.
**When to use:** Token generation for all auth flows.
**Example:**
```javascript
// server/middleware/auth.js
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '365d' } // effectively "until logout"
  );
}
```
**Note:** The Backyard Marquee pattern uses 7d expiry. Since the user wants "persist until logout," use a very long expiry (365d). The frontend clears the token on logout.

### Pattern 6: Username Auto-Generation
**What:** Derive a username from the display name at registration time.
**When to use:** Registration (username is NOT collected from the user).
**Recommendation:** Generate from display name by lowercasing, replacing spaces/special chars with hyphens, and appending a short random suffix if there's a collision.
**Example:**
```javascript
function generateUsername(displayName) {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);

  return base || 'user';
}

// Then check uniqueness and append suffix if needed:
async function ensureUniqueUsername(displayName) {
  let username = generateUsername(displayName);
  let existing = await db.get('SELECT 1 FROM users WHERE username = ?', username);
  let suffix = 1;
  while (existing) {
    username = `${generateUsername(displayName).substring(0, 17)}-${suffix}`;
    existing = await db.get('SELECT 1 FROM users WHERE username = ?', username);
    suffix++;
  }
  return username;
}
```

### Anti-Patterns to Avoid
- **Storing role only in frontend state:** Role MUST be in the JWT payload AND verified server-side on every admin request. Never trust client-side role checks alone.
- **Hardcoding admin email in code:** Use environment variables for the seed admin. The app should be self-bootstrapping from env vars alone.
- **Checking invite expiry only in SQL:** SQLite/Turso CURRENT_TIMESTAMP can differ from JS Date. Do the 7-day check in JavaScript after fetching the invite row.
- **Deleting used invites:** Keep used invites in the table with `used_by` and `used_at` fields. The admin needs to see the full history.
- **Putting password reset tokens in the URL hash:** Use query parameters (`?token=xxx`) so the server can validate on page load if needed. The hash fragment is not sent to the server.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | bcryptjs | Timing attacks, salt management, work factor tuning are all handled. bcrypt is purpose-built for passwords. |
| JWT creation/verification | Manual base64 encoding | jsonwebtoken | Signature verification, expiry checks, algorithm selection all handled. |
| Rate limiting | Request counter in memory | express-rate-limit | Handles sliding windows, header responses, store abstraction. |
| UUID generation | Math.random-based IDs | crypto.randomUUID() | Cryptographically secure, RFC 4122 compliant, built into Node.js. |
| Email sending | Raw SMTP socket code | nodemailer | SMTP protocol, connection pooling, TLS handling, template support all included. |
| CORS handling | Manual headers | cors middleware | Handles preflight, allowed methods, credentials, origin validation. |

**Key insight:** Auth is a domain where subtle bugs create security vulnerabilities. Every component (hashing, tokens, rate limiting) has well-tested libraries that handle edge cases that custom code invariably misses.

## Common Pitfalls

### Pitfall 1: JWT Payload Bloat / Stale Role
**What goes wrong:** Role is stored in JWT but user gets promoted/demoted. Old JWT still carries old role.
**Why it happens:** JWTs are stateless -- changing the user's role in the database doesn't invalidate existing tokens.
**How to avoid:** For this app's scale (small invite-only community), this is acceptable. If an admin promotes someone, the user logs out and back in to get a new token with the updated role. Document this in the admin UI ("changes take effect on next login").
**Warning signs:** User reports they don't have admin access after being promoted.

### Pitfall 2: Invite Token Timing Issues
**What goes wrong:** Invite created at 11:59 PM, checked against CURRENT_TIMESTAMP in SQLite which may use UTC vs local time.
**Why it happens:** SQLite CURRENT_TIMESTAMP is always UTC. JavaScript `new Date()` returns local time if not careful.
**How to avoid:** Store all timestamps as UTC (which SQLite does by default). Compare in JavaScript using UTC: `new Date(invite.created_at + 'Z')` if needed, or always use ISO strings.
**Warning signs:** Invites expiring early or late by timezone offset hours.

### Pitfall 3: Race Condition on Invite Consumption
**What goes wrong:** Two people click the same invite link simultaneously, both register.
**Why it happens:** Check-then-update pattern without a transaction.
**How to avoid:** Use a transaction or an atomic UPDATE with a WHERE clause that checks the unused state, then verify rows affected.
**Warning signs:** More registrations than invites created.
```javascript
// Atomic approach: UPDATE first, then check rowsAffected
const result = await db.run(
  'UPDATE invite_tokens SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE token = ? AND used_by IS NULL AND revoked_at IS NULL',
  userId, token
);
if (result.changes === 0) {
  // Token was already used or doesn't exist
  return res.status(400).json({ error: 'Invalid or already used invite' });
}
```

### Pitfall 4: Admin Seed Running on Every Restart
**What goes wrong:** Admin password gets reset every time the server starts, or duplicate admins created.
**Why it happens:** Seed function doesn't check if admin already exists.
**How to avoid:** Check `SELECT 1 FROM users WHERE role = 'admin'` before seeding. Only seed if no admin exists at all.
**Warning signs:** Admin can't log in after server restart (password was re-hashed from env).

### Pitfall 5: CORS Misconfiguration
**What goes wrong:** Frontend can't reach API, or credentials aren't sent.
**Why it happens:** CORS origin doesn't match frontend URL exactly, or credentials mode isn't set.
**How to avoid:** Set `origin` to match FRONTEND_URL exactly (including protocol and port). In dev, Vite's proxy bypasses CORS entirely for `/api` requests.
**Warning signs:** Browser console shows CORS errors on API calls.

### Pitfall 6: Forgetting to Handle Deactivated Accounts
**What goes wrong:** Deactivated contributor's existing JWT still works.
**Why it happens:** JWT is stateless -- deactivation flag in DB isn't checked.
**How to avoid:** Check user's `is_active` status in the `authenticateToken` middleware by querying the DB, or at minimum check on sensitive operations.
**Warning signs:** Deactivated user can still access the app.

## Code Examples

### Database Schema

```sql
-- Users table with roles and deactivation
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'contributor',  -- 'admin' or 'contributor'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Invite tokens
CREATE TABLE IF NOT EXISTS invite_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL,
  note TEXT,                              -- optional "for Sarah" note
  used_by INTEGER,                        -- NULL until used
  used_at DATETIME,                       -- NULL until used
  revoked_at DATETIME,                    -- NULL unless revoked
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (used_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Migrations table (same pattern as Backyard Marquee)
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### AuthContext with Role Support

```jsx
// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleAuthResponse = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    const res = await auth.login(email, password);
    return handleAuthResponse(res.data);
  };

  const register = async (email, password, displayName, token) => {
    const res = await auth.register(email, password, displayName, token);
    return handleAuthResponse(res.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### API Client with Auth Interceptor

```javascript
// client/src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, displayName, token) =>
    api.post('/auth/register', { email, password, displayName, token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

export const invites = {
  create: (note) => api.post('/invites', { note }),
  list: () => api.get('/invites'),
  revoke: (id) => api.patch(`/invites/${id}/revoke`),
};

export const users = {
  listContributors: () => api.get('/users/admin/contributors'),
  deactivate: (id) => api.patch(`/users/admin/${id}/deactivate`),
  activate: (id) => api.patch(`/users/admin/${id}/activate`),
  promote: (id) => api.patch(`/users/admin/${id}/promote`),
};

export default api;
```

### Password Reset Flow

```javascript
// server/routes/auth.js - Forgot password endpoint
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  // Always return success to prevent email enumeration
  res.json({ message: 'If an account exists, a reset link has been sent' });

  try {
    const user = await db.get('SELECT id FROM users WHERE email = ? AND is_active = 1', email);
    if (!user) return;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    await db.run(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      user.id, token, expiresAt
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendResetEmail(email, resetUrl);
  } catch (err) {
    console.error('Password reset error:', err);
  }
});
```

### Nodemailer Setup

```javascript
// server/lib/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendResetEmail(to, resetUrl) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@involuntaryresponse.com',
    to,
    subject: 'Reset your password',
    text: `Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<p>Click the link below to reset your password:</p>
           <p><a href="${resetUrl}">Reset Password</a></p>
           <p>This link expires in 1 hour.</p>`,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express 4 callback errors | Express 5 async error handling | Express 5.0.0 (Sep 2024) | No need for try/catch in every route handler -- thrown errors are caught automatically |
| uuid npm package | crypto.randomUUID() | Node.js 14.17+ | No dependency needed for UUID generation |
| bcrypt (native) | bcryptjs (pure JS) | Long-standing | No native compilation issues, same API, slightly slower but negligible for auth |
| 7-day JWT expiry (BYM) | 365-day JWT expiry (IR) | Project decision | Matches "persist until logout" requirement |

**Deprecated/outdated:**
- google-auth-library: NOT needed for Involuntary Response (no Google OAuth -- invite-only)
- html-to-image: NOT needed (no image export in this project)
- Guest account flow: NOT applicable (invite-only means no anonymous access)

## Open Questions

1. **SMTP Provider for Password Reset**
   - What we know: Nodemailer 8.0.1 is the standard library. Need an SMTP service.
   - What's unclear: Which email service to use (Gmail app passwords for dev, but production needs a real provider)
   - Recommendation: Use environment variables for all SMTP config. For development, use Ethereal (nodemailer's built-in test service that captures emails without sending). For production, configure a real SMTP provider (Resend, SendGrid, or similar) via env vars. The code is the same either way.

2. **Deactivated User Token Invalidation**
   - What we know: Deactivating a contributor doesn't invalidate their existing JWT.
   - What's unclear: How aggressively to check active status (every request vs. sensitive ops only)
   - Recommendation: Add `is_active` check in the `authenticateToken` middleware with a DB query. At this app's scale (small invite-only community), the extra DB hit per request is negligible. This prevents deactivated users from accessing anything.

3. **Username Editability**
   - What we know: Username is auto-generated at registration. PROF-01 says "contributor has a display name and username."
   - What's unclear: Whether contributors should be able to edit their username later.
   - Recommendation: Auto-generate at registration, allow editing in a future profile phase (Phase 4 covers PROF-02/03). For now, just generate and store it.

## Environment Variables (New for Involuntary Response)

The following env vars replace Backyard Marquee's config:

```
# Required
JWT_SECRET=...
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
FRONTEND_URL=...               # CORS origin + invite/reset URLs
PORT=3001                      # Default

# Admin seed (required for first run)
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
ADMIN_DISPLAY_NAME=...         # Optional, defaults to "Admin"

# Email / password reset
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=noreply@involuntaryresponse.com

# Removed from Backyard Marquee (not needed)
# SPOTIFY_CLIENT_ID (no Spotify in Phase 1)
# SPOTIFY_CLIENT_SECRET
# GOOGLE_CLIENT_ID (no Google OAuth)
```

## Sources

### Primary (HIGH confidence)
- Backyard Marquee existing codebase (`server/middleware/auth.js`, `server/routes/auth.js`, `server/db/index.js`, `client/src/context/AuthContext.jsx`, `client/src/api/client.js`) -- proven patterns for JWT + bcrypt + Turso + AuthContext
- [Express 5.1.0 release announcement](https://expressjs.com/2025/03/31/v5-1-latest-release.html) -- confirmed Express 5 is stable and tagged latest
- [Node.js crypto.randomUUID docs](https://nodejs.org/api/crypto.html) -- native UUID generation confirmed
- [@libsql/client npm](https://www.npmjs.com/package/@libsql/client) -- version 0.17.0 confirmed latest
- [jsonwebtoken npm](https://www.npmjs.com/package/jsonwebtoken) -- version 9.0.2 confirmed latest
- [bcryptjs npm](https://www.npmjs.com/package/bcryptjs) -- version 3.0.3 confirmed latest
- [nodemailer npm](https://www.npmjs.com/package/nodemailer) -- version 8.0.1 confirmed latest

### Secondary (MEDIUM confidence)
- [React Router v6 protected routes pattern](https://dev.to/m_yousaf/implementing-role-based-access-control-in-react-18-with-react-router-v6-a-step-by-step-guide-1p8b) -- verified against Backyard Marquee's existing pattern
- [Express role-based middleware patterns](https://gist.github.com/joshnuss/37ebaf958fe65a18d4ff) -- standard higher-order middleware approach
- [Nodemailer password reset flow](https://blog.logrocket.com/implementing-secure-password-reset-node-js/) -- standard token-based reset pattern

### Tertiary (LOW confidence)
- None -- all findings verified against either the existing codebase or official package pages

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- same stack as Backyard Marquee, all versions verified on npm
- Architecture: HIGH -- patterns directly adapted from working Backyard Marquee code
- Pitfalls: HIGH -- identified from real patterns in the existing codebase and standard JWT/invite-system concerns
- Schema design: HIGH -- SQLite/Turso patterns proven in existing codebase, invite token design follows standard patterns
- Password reset: MEDIUM -- nodemailer is standard but SMTP provider choice is deployment-dependent

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days -- stable stack, no fast-moving dependencies)
