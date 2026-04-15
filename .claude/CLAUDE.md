# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Involuntary Response — a curated music micro-blogging platform. Contributors write short-form reactions to songs, each post embedding a single music track (Spotify, YouTube, Apple Music, SoundCloud, Bandcamp, Vimeo). No ratings or algorithms — just people and songs that stopped them.

Live on Vercel (frontend) + Render (API) + Turso (database).

## Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios
- **Backend:** Express 5, Node.js
- **Database:** Turso (hosted SQLite) via @libsql/client
- **Auth:** JWT + bcrypt, invite-based contributor registration, public reader accounts
- **Embeds:** Universal oEmbed resolution (server-side) for 5 providers
- **Email:** Nodemailer (password resets)

## Commands

```bash
# Frontend (from client/)
npm run dev          # Vite dev server (localhost:5173, proxies /api → :3001)
npm run build        # Build to client/dist/

# Backend (from server/)
npm run dev          # node --watch index.js (localhost:3001)
npm run start        # Production start
```

No test runner or linter is configured.

## Project Structure

Monorepo: `client/` and `server/` each have their own `package.json`.

### Server

- **index.js** — Express app: Helmet CSP, CORS, origin validation, global rate limiter (200/min), body limit (100kb), route mounting, health check (`GET /api/health`), DB init, scheduler start, `validateEnv()` at boot
- **db/index.js** — Turso client, schema init (users + invite/reset tokens), migration runner (6 migrations for posts/embeds/tags/artists/likes/comments/scheduling), admin seed
- **middleware/auth.js** — `authenticateToken` (reads role from DB, not JWT), `optionalAuth`, `requireContributor`, `generateToken`
- **middleware/security.js** — Helmet CSP with oEmbed allowlist, `validateOrigin` (CSRF for state-changing requests)
- **middleware/admin.js** — `requireAdmin`
- **lib/scheduler.js** — Polls every 2 minutes, auto-publishes posts where `scheduled_at` has passed
- **lib/oembed.js** — Universal oEmbed resolver (Spotify, YouTube, Vimeo, SoundCloud, Bandcamp) + manual Apple Music
- **lib/spotify.js** / **lib/apple-music.js** — Artist extraction from embed URLs
- **lib/email.js** — Nodemailer for password reset
- **lib/post-helpers.js** — Batch-loads embeds/tags/artists/likes/comments, cursor-based pagination

### Server Routes (all `/api`)

| Route file | Prefix | What it does |
|---|---|---|
| auth.js | /auth | Register (invite-required), reader signup, login, forgot/reset password, GET /me |
| invites.js | /invites | Create/list/revoke invite tokens (admin) |
| users.js | /users | List/activate/deactivate/promote contributors (admin) |
| profile.js | /profile | Public profile GET, update bio PUT |
| posts.js | /posts | CRUD, likes, comments; supports draft/published/scheduled status |
| browse.js | /browse | By tag/artist/contributor, explore hub |
| embeds.js | /embeds | Resolve music URL → oEmbed metadata |
| feed.js | /feed | RSS feed |
| search.js | /search | Full-text search across posts, artists, tags, contributors |
| analytics.js | /analytics | Contributor stats + admin overview |

### Client

- **context/** — `AuthContext` (validates token via `/auth/me` on startup), `ThemeContext`
- **api/client.js** — Axios wrapper with auth interceptor + 401 auto-logout; exports `auth`, `invites`, `users`, `embeds`, `posts`, `browse`, `search`, `analytics`, `adminAnalytics`, `profile`
- **pages/** — Home (feed), About, CreatePost, EditPost, ViewPost, MyPosts, Stats, Explore, Search, Profile, TagBrowse, ArtistPage, JoinPage, Login, Register, ForgotPassword, ResetPassword, admin/ (Dashboard, Invites, Contributors, Stats)
- **components/** — PostCard, PostForm, EmbedPreview, EmbedInput, TagInput, CommentSection, LikeButton, RichBody, Avatar, Navbar (mobile hamburger), AdminRoute, ContributorRoute

## Auth Model

Three roles: **admin**, **contributor**, **reader**.
- Contributors require an invite token to register (admin creates tokens via `/api/invites`)
- Readers can self-register (passive consumption only)
- `authenticateToken` middleware reads role from DB on every request (not from JWT payload)
- Auth state in React via `AuthContext`, token stored in localStorage

## Database

Core tables: `users`, `invite_tokens`, `password_reset_tokens`, `posts`, `post_embeds`, `post_tags`, `post_artists`, `post_likes`, `post_comments`, plus `migrations`.

- Post statuses: `draft`, `scheduled`, `published`
- Migrations run automatically on DB init — append new migrations to the array in `db/index.js`
- All queries parameterized via @libsql driver

## Environment (server/.env)

```
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
JWT_SECRET=...
ADMIN_EMAIL=...          # Required — validateEnv() exits if missing
ADMIN_PASSWORD=...       # Required
ADMIN_DISPLAY_NAME=...   # Required
FRONTEND_URL=...         # CORS origin (default: http://localhost:5173)
PORT=3001
SMTP_HOST=...            # Optional — warns if missing
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

## Deployment

- **Vercel** serves the React SPA; `client/vercel.json` rewrites `/api/*` to Render backend
- **Render** runs the Express server; needs all env vars above
- **Turso** hosts the SQLite database
- OG meta tags: bot user-agents get rewritten to `/api/og` endpoint for social previews

## Conventions

- No TypeScript — plain JSX throughout
- Dev proxy: Vite forwards `/api` to `localhost:3001` (see `vite.config.js`)
- Rate limiting is per-endpoint (auth: 20/15min, posts: 20/60min, likes: 60/15min) plus global 200/min
- HTML stripped and max lengths enforced on all user input (server-side sanitization)
- Embed iframe attributes allowlisted (src, width, height, allow, sandbox only)
- CSP configured in `middleware/security.js` with frame-src for oEmbed providers
