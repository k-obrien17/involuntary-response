# Phase 4: Browse, Discovery, and Profiles - Research

**Researched:** 2026-02-27
**Domain:** Browse/filter pages, contributor profiles, artist pages, explore hub, schema extensions for artist data and user bios
**Confidence:** HIGH

## Summary

Phase 4 transforms the site from a single-stream feed into a navigable, discoverable collection. The work spans five domains: (1) a tag browse page showing posts filtered by tag, (2) an artist page showing posts featuring a given artist with the artist's image, (3) a contributor profile page at `/@username` with bio and post list, (4) an explore hub at `/explore` that surfaces popular tags, most-written-about artists, and active contributors, and (5) the backend API endpoints and schema migrations to support all of the above.

The most significant architectural challenge is **artist identification on posts**. The current `post_embeds` table stores `title` (track/album name only -- confirmed via live Spotify oEmbed call: "Never Gonna Give You Up" not "Never Gonna Give You Up - Rick Astley") and `thumbnail_url` (album artwork), but has no `artist_name` or `artist_image` column. To enable "browse posts by artist," we need a new `post_artists` table and enhanced embed resolution that fetches artist metadata from the Spotify Web API `/v1/tracks/{id}` endpoint during post creation. The Spotify Web API client credentials flow and token cache already exist in `server/routes/artists.js` and can be extracted into a shared utility.

The second key area is the **contributor profile** system. The `users` table currently has `display_name` and `username` but no `bio` or `avatar_url`. A migration adds the `bio` column (TEXT, max 300 chars). The CONTEXT.md decision specifies inline bio editing on the profile page -- clicking to edit when viewing your own profile. Avatar upload is deferred to v2 (PROF-04 in requirements), and the CONTEXT.md grants discretion on the avatar approach. For v1, no avatar -- just display name and bio.

All five new pages (tag browse, artist page, contributor profile, explore hub) plus the API endpoints follow the established patterns from Phase 3: same `max-w-2xl` single-column layout, Tailwind typography plugin, compact list format with title/contributor/date rows, and cursor-based pagination where needed.

**Primary recommendation:** Add a `post_artists` junction table (migration), enhance the `resolveEmbed` flow to extract artist name from Spotify Web API, add `bio` column to users table, create 5 new API endpoints, and build 4 new frontend pages plus updates to existing components (clickable tags, clickable artist names, clickable contributor names).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Compact list format -- each row shows title, contributor name (links to profile), and relative date
- Page heading is just the name (e.g., "hip-hop", "Kendrick Lamar") -- no post count
- Sorted newest first, no sort toggle
- Same text-first responsive design as the feed
- Artist pages: Small circular avatar (~64px) from Spotify artist image, next to artist name
- Artist pages: Use the image from the most recent post featuring that artist
- Artist pages: Below the header: compact post list of all posts featuring that artist
- Contributor profiles: URL pattern: `/@username`
- Contributor profiles: Page shows: display name, avatar, ~300 char bio, then their posts in compact list
- Contributor profiles: Bio editing is inline on the profile page -- click to edit when viewing your own profile
- Contributor profiles: Avatar + bio + post list (no social links)
- Explore page: Dedicated `/explore` page with three sections: popular tags, most-written-about artists, active contributors
- Explore page: Each item links to its respective browse page
- Explore page: Ranked by most recent activity (tags/artists/contributors from newest posts rank higher)
- Explore page: Linked from the main navbar as "Explore" alongside Home
- Navigation: Tags on posts are clickable pills linking to tag browse page
- Navigation: Artist names in post embeds are clickable linking to artist page
- Navigation: Contributor names link to profile page

### Claude's Discretion
- Avatar upload implementation (file upload vs Gravatar vs external URL -- pick simplest approach)
- Exact spacing, typography, and responsive breakpoints on browse pages
- Empty state treatment for browse pages with no results
- How many items to show per section on /explore before a "see all" link
- Artist deduplication strategy (Spotify ID vs name matching)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-02 | Visitor can browse posts filtered by tag | New `GET /api/browse/tag/:tag` endpoint querying `post_tags` table (index `idx_post_tags_tag` already exists), new `/tag/:tag` page with compact post list |
| DISC-03 | Visitor can browse posts filtered by artist | New `post_artists` table (migration), new `GET /api/browse/artist/:name` endpoint, new `/artist/:name` page with circular image header + compact post list |
| DISC-04 | Visitor can view all posts by a specific contributor | New `GET /api/browse/contributor/:username` endpoint querying `posts` by `author_id` (index `idx_posts_author_id` already exists), contributor profile page at `/@username` |
| PROF-02 | Contributor can write a bio (~300 characters) | `ALTER TABLE users ADD COLUMN bio TEXT` migration, `PUT /api/users/me` endpoint with auth, inline edit UI on profile page |
| PROF-03 | Visitor can view a contributor's profile page | `GET /api/users/:username/profile` endpoint returning public user info + posts, `/@username` route in React Router |
</phase_requirements>

## Standard Stack

### Core (Already Installed)

No new runtime dependencies needed. Everything builds on the existing stack.

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | 18.3.1 | Frontend UI | Installed (client) |
| React Router | 6.28.0 | Client routing, new routes for browse/profile pages | Installed (client) |
| Tailwind CSS | 3.4.14 | Utility-first styling, prose classes from Phase 3 | Installed (client) |
| @tailwindcss/typography | 0.5.x | Prose classes for post body text on browse pages | Installed (client, dev) |
| Axios | 1.7.7 | API calls | Installed (client) |
| Express | 5.1.0 | API server, new endpoints | Installed (server) |
| @libsql/client | 0.14.0 | Turso database driver | Installed (server) |

### Supporting (Already Available)

| Library/API | Purpose | When to Use |
|-------------|---------|-------------|
| Spotify Web API (client credentials) | Fetch artist name from track/album during embed resolution | During post creation, when a Spotify URL is embedded |
| `Intl.RelativeTimeFormat` | Relative timestamps on browse page post lists | All post list rows (already in `utils/formatDate.js`) |

### Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `post_artists` junction table | Parse artist from oEmbed `title` field | Spotify oEmbed `title` is track/album name only (confirmed: "Never Gonna Give You Up", not "...by Rick Astley"). No artist info in oEmbed response |
| Spotify Web API `/v1/tracks/{id}` for artist name | Require contributors to manually enter artist name | Manual entry adds friction and introduces typos/inconsistency. The Spotify ID is already parseable from the embed URL |
| `/@username` React Router path | `/profile/:username` or `/u/:username` | User locked decision: `/@username` URL pattern. The `@` prefix is a well-established convention (Twitter, Instagram, GitHub). React Router v6 handles this with `path="/@:username"` |
| No avatar for v1, bio text only | Gravatar, file upload, or external URL | PROF-04 (avatar upload) is explicitly v2. For v1, the profile shows display name + bio text only. Simplest approach per requirements |
| Recency-ranked explore page | Algorithmic scoring or post count ranking | User locked decision: "Ranked by most recent activity." Simple `MAX(created_at)` aggregation per tag/artist/contributor |

### Installation

```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure (New/Modified Files)

```
client/src/
├── pages/
│   ├── TagBrowse.jsx          # NEW: Posts filtered by tag
│   ├── ArtistPage.jsx         # NEW: Artist header + posts featuring artist
│   ├── Profile.jsx            # NEW: Contributor profile (/@username)
│   └── Explore.jsx            # NEW: Discovery hub (/explore)
├── components/
│   ├── PostCard.jsx           # MODIFY: Make tags clickable (Link), contributor name clickable
│   ├── PostListItem.jsx       # NEW: Compact post row for browse pages (title, contributor, date)
│   └── Navbar.jsx             # MODIFY: Add "Explore" link
├── api/
│   └── client.js              # MODIFY: Add browse/profile API methods
└── App.jsx                    # MODIFY: Add new routes

server/
├── db/index.js                # MODIFY: Add migrations (post_artists table, users.bio column)
├── routes/
│   ├── browse.js              # NEW: GET /tag/:tag, /artist/:name, /contributor/:username
│   ├── posts.js               # MODIFY: Insert into post_artists during create/update
│   └── profile.js             # NEW: GET /users/:username/profile, PUT /users/me
├── lib/
│   ├── oembed.js              # MODIFY: Return artist info alongside embed data
│   └── spotify.js             # NEW: Shared Spotify token cache + Web API helpers (extract from routes/artists.js)
└── index.js                   # MODIFY: Mount new route files
```

### Pattern 1: Post Artists Junction Table

**What:** A new `post_artists` table stores the artist(s) associated with each post's embed. This enables efficient queries for "all posts featuring artist X" without parsing embed titles or making runtime API calls.

**When to use:** Populated during post creation (and update) whenever a Spotify or Apple Music embed is resolved. Queried by the artist browse page.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS post_artists (
  post_id INTEGER NOT NULL,
  artist_name TEXT NOT NULL,
  artist_image TEXT,
  spotify_id TEXT,
  PRIMARY KEY (post_id, artist_name),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_artists_name ON post_artists(artist_name COLLATE NOCASE);
```

**Why a junction table, not a column on post_embeds:** A track can have multiple artists (features, collaborations). A junction table handles this naturally. It also cleanly separates the embed data (how to render the player) from the artist metadata (who performed it).

### Pattern 2: Spotify Artist Extraction During Embed Resolution

**What:** When a Spotify URL is embedded, extract the track/album ID from the URL, call the Spotify Web API to get the artist name(s), and return them alongside the embed data. The existing client credentials flow and token cache in `routes/artists.js` should be extracted into a shared `lib/spotify.js` module.

**When to use:** During `resolveEmbed()` for Spotify URLs only. Apple Music extraction is best-effort from the URL slug.

**Example:**
```javascript
// server/lib/spotify.js — shared token cache + API helpers
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let expiresAt = 0;

export async function getSpotifyToken() {
  if (accessToken && Date.now() < expiresAt) return accessToken;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Spotify token failed: ${res.status}`);
  const data = await res.json();
  accessToken = data.access_token;
  expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

export async function getTrackArtists(trackId) {
  const token = await getSpotifyToken();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.artists || []).map(a => ({
    name: a.name,
    spotifyId: a.id,
  }));
}

export async function getAlbumArtists(albumId) {
  const token = await getSpotifyToken();
  const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.artists || []).map(a => ({
    name: a.name,
    spotifyId: a.id,
  }));
}
```

**Key detail:** The Spotify Web API `/v1/tracks/{id}` response includes `artists` as SimplifiedArtistObject (with `name` and `id` but NOT `images`). Artist images are NOT available from the track endpoint. Per the user's decision, the artist page avatar uses the `thumbnail_url` from the most recent post's embed (album artwork), not a headshot.

### Pattern 3: Compact Post List Item

**What:** A reusable component for browse pages that renders a post as a single compact row: truncated body (first ~100 chars), contributor name (linked to profile), and relative date.

**When to use:** Tag browse, artist page, contributor profile, explore page preview lists.

**Example:**
```jsx
// client/src/components/PostListItem.jsx
import { Link } from 'react-router-dom';
import { relativeTime } from '../utils/formatDate';

export default function PostListItem({ post }) {
  // First ~100 chars of body as preview
  const preview = post.body.length > 100
    ? post.body.slice(0, 100).trim() + '...'
    : post.body;

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <Link
        to={`/posts/${post.slug}`}
        className="text-gray-900 hover:text-gray-600 transition"
      >
        <p className="text-base leading-snug">{preview}</p>
      </Link>
      <div className="mt-1 text-sm text-gray-400 flex items-center gap-2">
        <Link
          to={`/@${post.author.username}`}
          className="hover:text-gray-600 transition"
        >
          {post.author.displayName}
        </Link>
        <span>&middot;</span>
        <span>{relativeTime(post.createdAt)}</span>
      </div>
    </div>
  );
}
```

### Pattern 4: Browse API Endpoints with Batch Loading

**What:** Browse endpoints follow the same pattern as the feed: query posts matching a filter, batch-load embeds/tags/artists, return paginated results. The difference is the WHERE clause and the optional header data (artist image, contributor bio).

**When to use:** All three browse endpoints (tag, artist, contributor).

**Example (tag browse):**
```javascript
// server/routes/browse.js
router.get('/tag/:tag', async (req, res) => {
  const tag = req.params.tag.toLowerCase();
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
  const cursor = req.query.cursor;

  let rows;
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('|');
    rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.author_id, p.created_at,
              u.display_name AS author_display_name, u.username AS author_username
       FROM posts p
       JOIN users u ON p.author_id = u.id
       JOIN post_tags pt ON p.id = pt.post_id
       WHERE pt.tag = ? AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      tag, cursorDate, cursorDate, parseInt(cursorId), limit + 1
    );
  } else {
    rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.author_id, p.created_at,
              u.display_name AS author_display_name, u.username AS author_username
       FROM posts p
       JOIN users u ON p.author_id = u.id
       JOIN post_tags pt ON p.id = pt.post_id
       WHERE pt.tag = ?
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      tag, limit + 1
    );
  }

  // ... same hasMore/cursor/batch-load pattern as feed
});
```

### Pattern 5: `/@username` Route in React Router v6

**What:** React Router v6 supports literal characters in path patterns. The `@` symbol is part of the path, not the parameter. Use `path="/@:username"` to match URLs like `/@keithobrien`.

**When to use:** The contributor profile route.

**Example:**
```jsx
// In App.jsx
<Route path="/@:username" element={<Profile />} />

// In Profile.jsx
const { username } = useParams(); // "keithobrien" (no @ prefix)
```

**Important:** The `@` is consumed by the path pattern, so `useParams().username` returns just the username without the `@`. No URL decoding needed since usernames are already restricted to `[a-z0-9-]` by the existing `generateUsername` function in `routes/auth.js`.

### Pattern 6: Inline Bio Editing

**What:** On the profile page, when the logged-in user views their own profile, the bio text has an "edit" affordance. Clicking it reveals a textarea with a save button. This is a simple controlled component pattern -- no complex inline editing library needed.

**When to use:** Only on the contributor's own profile page (check `user.username === profileUsername`).

**Example:**
```jsx
function BioEditor({ currentBio, onSave }) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(currentBio || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(bio);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="group">
        <p className="text-gray-600">{currentBio || 'No bio yet.'}</p>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-gray-400 hover:text-gray-600 mt-1"
        >
          Edit bio
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value.slice(0, 300))}
        maxLength={300}
        rows={3}
        className="w-full border border-gray-200 rounded p-2 text-base"
        autoFocus
      />
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-400">{bio.length}/300</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm bg-gray-900 text-white px-3 py-1 rounded"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => { setEditing(false); setBio(currentBio || ''); }}
          className="text-sm text-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

### Pattern 7: Explore Page with Recency Ranking

**What:** The explore page shows three sections. Each ranks items by the most recent post activity, not by total count. This is a SQL `MAX(created_at)` aggregation.

**When to use:** The `/api/explore` endpoint.

**Example:**
```javascript
// Popular tags — ranked by most recent post with that tag
const tags = await db.all(`
  SELECT pt.tag, MAX(p.created_at) as latest
  FROM post_tags pt
  JOIN posts p ON pt.post_id = p.id
  GROUP BY pt.tag
  ORDER BY latest DESC
  LIMIT ?
`, limit);

// Most-written-about artists — ranked by most recent post featuring that artist
const artists = await db.all(`
  SELECT pa.artist_name, pa.artist_image, MAX(p.created_at) as latest
  FROM post_artists pa
  JOIN posts p ON pa.post_id = p.id
  GROUP BY pa.artist_name COLLATE NOCASE
  ORDER BY latest DESC
  LIMIT ?
`, limit);

// Active contributors — ranked by most recent post
const contributors = await db.all(`
  SELECT u.username, u.display_name, MAX(p.created_at) as latest
  FROM users u
  JOIN posts p ON u.id = p.author_id
  GROUP BY u.id
  ORDER BY latest DESC
  LIMIT ?
`, limit);
```

### Anti-Patterns to Avoid

- **Parsing artist name from oEmbed title:** Spotify oEmbed `title` contains only the track/album name (confirmed by live API call). Do NOT attempt regex parsing like "Track - Artist" -- this format is not used by Spotify oEmbed.
- **Making Spotify API calls at browse-page render time:** Artist data should be stored at post-creation time in `post_artists`. Never call the Spotify API when a visitor loads a browse page -- this would be slow, rate-limited, and would fail for Apple Music posts.
- **Fetching artist images from Spotify for artist page avatars:** The user decision says "use the image from the most recent post featuring that artist" -- this means the `thumbnail_url` from `post_embeds` (album artwork). Do NOT make extra Spotify `/v1/artists/{id}` calls for artist headshots.
- **N+1 queries on browse pages:** Use the same batch `IN(...)` pattern from Phase 3's feed endpoint. Don't fetch embeds/tags per-post in a loop.
- **Storing bio in localStorage:** The bio is server-side data. After a bio update, refresh the profile from the API. Don't try to sync it through localStorage/AuthContext.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Artist identification from Spotify URLs | Custom title parsing or contributor manual entry | Spotify Web API `/v1/tracks/{id}` and `/v1/albums/{id}` with existing client credentials flow | The oEmbed title field does not contain artist names. The Web API is authoritative and the auth flow already exists |
| Case-insensitive artist grouping | JavaScript-level deduplication | SQLite `COLLATE NOCASE` on queries + `artist_name COLLATE NOCASE` index | Database-level collation handles "Kendrick Lamar" vs "kendrick lamar" without application code |
| Inline bio editing | Rich text editor or contentEditable with undo/redo | Simple textarea with `useState` toggle | Bio is 300 chars of plain text. A textarea with save/cancel is 30 lines of code |
| Compact post list rows | Full PostCard component with embeds | New lightweight `PostListItem` component | Browse pages show compact rows (body preview + author + date), not full post cards with embeds. Mixing them would break the compact layout |
| URL parameter handling for `/@username` | Custom URL parsing or middleware | React Router v6 `path="/@:username"` + `useParams()` | React Router handles the `@` prefix as a literal path character natively |

**Key insight:** The biggest technical lift in this phase is the data pipeline -- storing artist metadata at post-creation time so browse pages can query it efficiently. Once the `post_artists` table exists and is populated, all browse pages are straightforward database queries with the same patterns already proven in Phase 3's feed.

## Common Pitfalls

### Pitfall 1: Spotify API Rate Limits During Post Creation

**What goes wrong:** Post creation now makes an additional Spotify Web API call (`/v1/tracks/{id}`) beyond the oEmbed call. If Spotify rate-limits the server, post creation silently loses artist metadata.
**Why it happens:** Spotify's rate limits are per-app, not per-user. High post creation volume (unlikely with invite-only contributors) could trigger limits.
**How to avoid:** Make the artist metadata fetch non-fatal -- if it fails, the post still saves with its embed, but `post_artists` is empty. The artist browse page simply won't include that post. Log the failure for debugging. This matches the existing pattern where oEmbed metadata fetch is already non-fatal.
**Warning signs:** Posts appearing in the feed but not on artist browse pages.

### Pitfall 2: Apple Music Posts Missing from Artist Browse

**What goes wrong:** Apple Music embeds have no programmatic API to fetch artist metadata (no oEmbed, no public API without Apple Developer token). Posts with Apple Music embeds won't appear on artist browse pages.
**Why it happens:** Apple Music's embed ecosystem is less open than Spotify's.
**How to avoid:** Document this as a known limitation. For v1, artist browse is Spotify-sourced only. Apple Music posts are still visible in the feed, tag browse, and contributor profiles -- they just don't appear on artist-specific pages. A future enhancement could add manual artist tagging or Apple MusicKit integration.
**Warning signs:** Contributors confused about why Apple Music posts don't show up on artist pages.

### Pitfall 3: Artist Name Deduplication

**What goes wrong:** The same artist appears multiple times on the explore page because different posts stored slightly different name strings (e.g., "Beyonce" vs "Beyoncé" vs "BEYONCÉ").
**Why it happens:** Spotify returns canonical artist names, but if data enters from other sources or edge cases, inconsistencies arise.
**How to avoid:** Use `COLLATE NOCASE` for case-insensitive grouping in SQL queries. Store the exact Spotify-canonical name (from the Web API response) in `post_artists`. Add a `spotify_id` column for authoritative deduplication when available. For queries, group by `artist_name COLLATE NOCASE`.
**Warning signs:** Duplicate artist entries on the explore page.

### Pitfall 4: Profile Route Collision with Other Routes

**What goes wrong:** The `/@:username` route could conflict with other routes if not ordered correctly in React Router. For example, `/@admin` might be confused with an admin route.
**Why it happens:** React Router v6 uses route ranking by specificity, but literal matches like `/admin` should win over parameterized matches like `/@:username`. However, since `/@:username` has a literal `@` prefix, it won't conflict with `/admin` (no `@` prefix).
**How to avoid:** The `@` prefix naturally namespaces profile URLs. No route ordering issues. The only risk is if someone creates a username that matches a reserved word -- but usernames are auto-generated from display names and restricted to `[a-z0-9-]` by the existing auth flow.
**Warning signs:** Navigation to profile pages rendering the wrong component.

### Pitfall 5: Stale AuthContext After Bio Update

**What goes wrong:** After updating their bio, the contributor's profile page shows the old bio because the AuthContext user object (stored in localStorage) doesn't include bio.
**Why it happens:** The auth flow stores `{ id, email, displayName, username, role }` in localStorage. Bio is not part of this object.
**How to avoid:** The profile page should fetch profile data from the API (`GET /api/users/:username/profile`), not from AuthContext. AuthContext is for authentication state (is the user logged in, what's their role). Profile data is fetched fresh from the API. The bio update (`PUT /api/users/me`) should trigger a refetch of the profile page data.
**Warning signs:** Bio appearing in the API response but not on the page until hard refresh.

### Pitfall 6: Empty State on Browse Pages

**What goes wrong:** A tag browse page for a tag with zero posts shows a blank white page or a loading spinner that never resolves.
**Why it happens:** No posts match the filter, and the empty state isn't handled.
**How to avoid:** Every browse page needs an explicit empty state: "No posts tagged #hip-hop yet" or "No posts about Kendrick Lamar yet." Test with non-existent tags/artists/usernames during development.
**Warning signs:** Blank pages when navigating to less popular tags or new artists.

### Pitfall 7: Backfilling Artist Data for Existing Posts

**What goes wrong:** Existing posts created before the `post_artists` migration have no artist data. They won't appear on artist browse pages even if their Spotify embeds clearly reference specific artists.
**Why it happens:** The migration creates the table but doesn't retroactively parse existing embeds.
**How to avoid:** Write a one-time backfill migration or script that: (1) finds all posts with Spotify embeds, (2) extracts the track/album ID from `embed_url` or `original_url`, (3) calls the Spotify Web API to get artist names, and (4) inserts into `post_artists`. This should run as a migration (id: 4) or as a separate script. Make it idempotent.
**Warning signs:** Artist browse pages showing zero posts even though the feed clearly has posts about those artists.

## Code Examples

### Migration: post_artists Table + users.bio Column

```javascript
// Add to migrations array in server/db/index.js
{
  id: 3,
  name: 'add_post_artists_and_user_bio',
  sql: `
    CREATE TABLE IF NOT EXISTS post_artists (
      post_id INTEGER NOT NULL,
      artist_name TEXT NOT NULL,
      artist_image TEXT,
      spotify_id TEXT,
      PRIMARY KEY (post_id, artist_name),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_post_artists_name
      ON post_artists(artist_name COLLATE NOCASE);

    ALTER TABLE users ADD COLUMN bio TEXT;
  `,
},
```

### Shared Spotify Utility

```javascript
// server/lib/spotify.js
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let expiresAt = 0;

export async function getSpotifyToken() {
  if (accessToken && Date.now() < expiresAt) return accessToken;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Spotify token failed: ${res.status}`);
  const data = await res.json();
  accessToken = data.access_token;
  expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

// Extract track/album ID from Spotify URL
export function parseSpotifyUrl(url) {
  const match = url.match(
    /open\.spotify\.com\/(track|album)\/([a-zA-Z0-9]+)/
  );
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

// Get artists for a track or album
export async function getArtistsForSpotifyUrl(url) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return [];

  const parsed = parseSpotifyUrl(url);
  if (!parsed) return [];

  try {
    const token = await getSpotifyToken();
    const endpoint = parsed.type === 'track'
      ? `https://api.spotify.com/v1/tracks/${parsed.id}`
      : `https://api.spotify.com/v1/albums/${parsed.id}`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.artists || []).map(a => ({
      name: a.name,
      spotifyId: a.id,
    }));
  } catch {
    return [];
  }
}
```

### Artist Insertion During Post Creation

```javascript
// In server/routes/posts.js POST / handler, after embed insertion:
import { getArtistsForSpotifyUrl } from '../lib/spotify.js';

// Inside the post creation handler, after inserting the embed:
if (embedUrl) {
  const resolved = await resolveEmbed(embedUrl);
  if (resolved) {
    await db.run(/* ...insert embed as before... */);

    // Extract and store artist metadata (non-fatal)
    try {
      const artists = await getArtistsForSpotifyUrl(embedUrl);
      for (const artist of artists) {
        await db.run(
          'INSERT OR IGNORE INTO post_artists (post_id, artist_name, artist_image, spotify_id) VALUES (?, ?, ?, ?)',
          postId, artist.name, resolved.thumbnailUrl || null, artist.spotifyId || null
        );
      }
    } catch (err) {
      console.error('Artist extraction failed (non-fatal):', err);
    }
  }
}
```

### Profile API Endpoint

```javascript
// server/routes/profile.js
import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import db from '../db/index.js';

const router = Router();

// GET /api/users/:username/profile — Public profile
router.get('/:username/profile', async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, display_name, username, bio, created_at FROM users WHERE username = ? AND is_active = 1',
      req.params.username
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch their posts (compact: no embeds needed for list view)
    const posts = await db.all(
      `SELECT p.id, p.slug, p.body, p.created_at,
              u.display_name AS author_display_name, u.username AS author_username
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.author_id = ?
       ORDER BY p.created_at DESC`,
      user.id
    );

    res.json({
      user: {
        displayName: user.display_name,
        username: user.username,
        bio: user.bio || null,
        createdAt: user.created_at,
      },
      posts: posts.map(p => ({
        id: p.id,
        slug: p.slug,
        body: p.body,
        createdAt: p.created_at,
        author: {
          displayName: p.author_display_name,
          username: p.author_username,
        },
      })),
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /api/users/me — Update own profile (bio)
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const bio = req.body.bio != null
      ? String(req.body.bio).trim().replace(/<[^>]*>/g, '').slice(0, 300)
      : null;

    await db.run('UPDATE users SET bio = ? WHERE id = ?', bio, req.user.id);
    res.json({ bio });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
```

### Explore API Endpoint

```javascript
// server/routes/browse.js (explore section)
router.get('/explore', async (req, res) => {
  const limit = 10;

  try {
    const tags = await db.all(`
      SELECT pt.tag, MAX(p.created_at) as latest
      FROM post_tags pt
      JOIN posts p ON pt.post_id = p.id
      GROUP BY pt.tag
      ORDER BY latest DESC
      LIMIT ?
    `, limit);

    const artists = await db.all(`
      SELECT pa.artist_name, pa.artist_image, MAX(p.created_at) as latest
      FROM post_artists pa
      JOIN posts p ON pa.post_id = p.id
      GROUP BY pa.artist_name COLLATE NOCASE
      ORDER BY latest DESC
      LIMIT ?
    `, limit);

    const contributors = await db.all(`
      SELECT u.username, u.display_name, MAX(p.created_at) as latest
      FROM users u
      JOIN posts p ON u.id = p.author_id
      WHERE u.is_active = 1
      GROUP BY u.id
      ORDER BY latest DESC
      LIMIT ?
    `, limit);

    res.json({ tags, artists, contributors });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ error: 'Failed to load explore' });
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Parse artist from embed title strings | Store artist metadata at creation time via Web API | Standard practice in content platforms | Reliable, queryable artist data without fragile parsing |
| Separate profile service / microservice | Profile as additional columns + dedicated route | Always for monolith apps at this scale | No infrastructure overhead, single database |
| Server-rendered profile pages for SEO | Client-rendered SPA profile pages | SPA standard for invite-only contributor platforms | Simpler architecture, SEO not critical for auth-gated profiles |
| Complex inline editing libraries (Draft.js, Slate) | Simple textarea toggle for short text fields | Standard for fields under ~500 chars | 30 lines of code vs. thousands of lines of dependency |

**Deprecated/outdated:**
- Complex rich-text inline editors for short bio fields -- overkill for 300-char plain text
- Parsing structured data from oEmbed title fields -- oEmbed titles are display-only, not machine-readable
- File upload avatars for v1 -- explicitly deferred to v2 (PROF-04)

## Open Questions

1. **Apple Music artist extraction**
   - What we know: Apple Music has no public oEmbed API and no free catalog API. The Apple MusicKit JS requires an Apple Developer token with a paid developer account.
   - What's unclear: Whether the URL slug (e.g., `/album/good-kid-m-a-a-d-city/...`) can be reliably parsed to extract artist name.
   - Recommendation: For v1, Apple Music posts are not indexed by artist. They appear in the feed, tag browse, and contributor profiles, but not on artist browse pages. Document this as a known limitation. If the user wants Apple Music artist support later, the cleanest path is adding an optional manual artist-name field to the post form.

2. **Backfill strategy for existing posts**
   - What we know: Any posts created before this phase will have embeds but no `post_artists` data.
   - What's unclear: How many posts exist and whether a migration-time backfill or a separate script is better.
   - Recommendation: Include a backfill in the migration or as a one-time script that runs after migration. Parse the Spotify track/album ID from existing `post_embeds.original_url` values and call the Spotify Web API. Make it idempotent (INSERT OR IGNORE).

3. **How many items on the /explore page before "see all"**
   - What we know: User gave this as Claude's discretion.
   - Recommendation: 10 items per section (tags, artists, contributors). This provides meaningful discovery without overwhelming the page. A "See all" link at the bottom of each section links to a full browse page if needed in a later phase.

4. **Artist image on artist page: album art or artist headshot?**
   - What we know: The user decision says "Small circular avatar (~64px) from Spotify artist image" and "Use the image from the most recent post featuring that artist." The Spotify Web API track endpoint returns SimplifiedArtistObject without images. The `thumbnail_url` from oEmbed is album artwork.
   - Recommendation: Use the `thumbnail_url` from the most recent post's embed as the artist page avatar. Store this in `post_artists.artist_image`. When rendering the artist page, query `post_artists` for the most recent image. Album art is visually distinctive and available without extra API calls. This aligns with the "image from the most recent post" decision.

## Sources

### Primary (HIGH confidence)
- Spotify oEmbed API (live test): Confirmed `title` field returns track/album name only, no artist name. Tested with `https://open.spotify.com/oembed?url=...` for track "Never Gonna Give You Up" -- returned `"title": "Never Gonna Give You Up"` with no artist field.
- [Spotify oEmbed API Reference](https://developer.spotify.com/documentation/embeds/reference/oembed) -- Response format documentation
- [Spotify Web API Get Track](https://developer.spotify.com/documentation/web-api/reference/get-track) -- `artists` array in response contains SimplifiedArtistObject with `name` and `id` but no `images`
- Existing codebase: `server/routes/artists.js` (Spotify client credentials flow + token cache), `server/lib/oembed.js` (embed resolver), `server/db/index.js` (schema + migration runner), `server/routes/posts.js` (post CRUD), `client/src/components/PostCard.jsx`, `client/src/api/client.js`
- Existing codebase: `server/routes/auth.js` -- username generation: `[a-z0-9-]` pattern, max 20 chars, auto-deduplication with numeric suffix

### Secondary (MEDIUM confidence)
- [React Router v6 Route Paths](https://reactrouter.com/en/main/route/route) -- `path="/@:username"` pattern with literal prefix characters. Verified via multiple community sources that literal characters before `:param` are supported.
- [SQLite COLLATE NOCASE](https://www.sqlite.org/datatype3.html#collation) -- Case-insensitive collation for text comparison in indexes and queries

### Tertiary (LOW confidence)
- Apple Music artist extraction: No authoritative source found for extracting artist name from Apple Music URLs without Apple MusicKit. Flagged as a known gap.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns build on Phase 3's established architecture
- Architecture: HIGH -- junction table for post artists is standard relational pattern, browse endpoints follow proven feed pattern, profile CRUD is straightforward
- Pitfalls: HIGH -- key risk (Spotify oEmbed lacking artist data) verified via live API call, not just documentation
- Data pipeline: HIGH -- Spotify Web API client credentials flow already exists in codebase, extraction pattern is well-documented
- Apple Music gap: LOW -- no reliable way to extract artist metadata from Apple Music embeds without paid API access

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain -- Spotify API is mature, React Router v6 is stable)
