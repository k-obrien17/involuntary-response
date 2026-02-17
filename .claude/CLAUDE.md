# CLAUDE.md — Backyard Marquee

Web app where users build and share 5-artist dream concert lineups. Search artists via Spotify, arrange by slot position, add tags and notes, share publicly or keep private. Social features: likes, comments, remix.

Live on Vercel (frontend) + Render (API) + Turso (database).

## Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios
- **Backend:** Express 5, Node.js
- **Database:** Turso (hosted SQLite) via @libsql/client
- **Auth:** JWT + bcrypt, Google OAuth, guest accounts with claim flow
- **API:** Spotify Web API (client credentials flow, server-side token cache)
- **Image export:** html-to-image (DOM → PNG)

## Project Structure

Monorepo with separate `client/` and `server/` directories, each with their own `package.json`.

```
client/src/
├── pages/          # 11 route pages (Home, CreateLineup, ViewLineup, Discover, etc.)
├── components/     # 7 reusable components (Navbar, ArtistSearch, Comments, etc.)
├── context/        # AuthContext (user state), ThemeContext
├── api/client.js   # Axios wrapper with auth interceptor
└── App.jsx         # React Router setup

server/
├── index.js        # Express app, CORS, routes, OG meta tags, error handler
├── db/index.js     # Turso client, schema init, migration runner (14 migrations)
├── middleware/auth.js  # JWT verify, optional/required auth, token generation
└── routes/
    ├── auth.js     # Register, login, Google OAuth, guest claim
    ├── lineups.js  # CRUD, likes, comments, tags, sanitization, rate limits
    ├── artists.js  # Spotify search proxy
    ├── users.js    # Public user profiles
    └── stats.js    # Leaderboard, artist detail, browse, tags, site stats
```

## Commands

```bash
# Frontend
cd client && npm run dev       # Vite dev server (localhost:5173, proxies /api → :3001)
cd client && npm run build     # Build to client/dist/

# Backend
cd server && npm run dev       # node --watch index.js (localhost:3001)
cd server && npm run start     # Production start
```

## Environment (server/.env)

```
JWT_SECRET=...
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
FRONTEND_URL=...               # CORS origin
PORT=3001                      # Default
```

## Database Schema

6 tables: `users`, `lineups`, `lineup_artists`, `lineup_tags`, `lineup_likes`, `lineup_comments`, plus `migrations`. Schema and migrations defined inline in `server/db/index.js`.

- Lineup slots: positions 0–4 (local opener → headliner). Position 4 = headliner.
- Tags: up to 5 per lineup, lowercase, sanitized
- Likes: one per user per lineup (UNIQUE constraint)
- Artist notes: max 300 chars per slot

## API Routes

All prefixed `/api`:
- `POST /auth/register|login|google` — Auth flows + guest claim
- `GET|POST|PUT|DELETE /lineups` — CRUD + likes + comments
- `GET /artists/search?q=` — Spotify artist search
- `GET /users/:username` — Public profile
- `GET /stats/leaderboard|browse|tags|site` — Discovery + analytics
- `GET /stats/artist/:name` — Artist detail stats

## Key Patterns

- **Guest flow:** Anonymous lineup creation auto-creates guest account, returns `claimToken`. User can claim on registration.
- **Spotify tokens:** Server-side client credentials, cached with early expiry in `routes/artists.js`
- **Rate limiting:** Per-endpoint (20 auth attempts/15min, 20 creates/60min, 60 likes/15min)
- **OG meta tags:** Server-rendered in `index.js` for social crawlers (lineup title/description)
- **Sanitization:** HTML stripped, max lengths enforced, trim applied on all user input
- **SQL:** All queries parameterized via @libsql driver

## Conventions

- No TypeScript — plain JSX throughout
- Auth state via React Context (`AuthContext`), token in localStorage
- Dev proxy: Vite forwards `/api` to `localhost:3001` (see `vite.config.js`)
- Migrations run automatically on DB init — append new migrations to the array in `db/index.js`
- Never commit `.env` or `*.db*` files
