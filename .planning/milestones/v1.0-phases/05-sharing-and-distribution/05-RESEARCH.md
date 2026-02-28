# Phase 5: Sharing and Distribution - Research

**Researched:** 2026-02-27
**Domain:** OG meta tags (SPA on Vercel), RSS feed generation (Express), dark mode (Tailwind CSS)
**Confidence:** HIGH

## Summary

Phase 5 covers three independent features: dynamic OG meta tags for social sharing, an RSS feed endpoint, and dark mode with system preference detection. Each operates in a different layer of the stack (Vercel serverless functions, Express API, React/Tailwind client) with no cross-dependencies between them.

The core challenge is OG meta tags for a Vite SPA deployed on Vercel. Social media crawlers (Twitter, Slack, iMessage) do not execute JavaScript -- they read the initial HTML response. The current `vercel.json` rewrites all routes to `/index.html`, which has no dynamic OG tags. The proven solution is a Vercel serverless function that intercepts post permalink requests, fetches post metadata from the Render API, and returns the SPA's `index.html` with OG placeholders replaced by real data.

RSS feed generation is straightforward -- an Express endpoint on the Render server queries recent posts and returns XML using the `feed` npm package. Dark mode leverages the existing `darkMode: 'class'` already configured in `tailwind.config.js`, plus a ThemeContext with localStorage persistence and an inline `<head>` script to prevent flash of wrong theme (FOUC).

**Primary recommendation:** Implement as a single plan with three parallel task tracks (OG tags, RSS, dark mode) since they are fully independent.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHAR-02 | Shared post links show rich previews on social media (OG meta tags with artist image + excerpt) | Vercel serverless function approach with placeholder replacement in index.html; fetches post data from Render API; vercel.json routing rules to intercept `/posts/:slug` |
| SHAR-03 | Site provides an RSS feed of recent posts | Express endpoint at `/api/feed` using the `feed` npm package (v5.2.0); queries posts with embeds; returns RSS 2.0 XML |
| DSGN-03 | Dark mode with system preference detection and manual toggle | Tailwind `darkMode: 'class'` (already configured); ThemeContext with three-way toggle (light/dark/system); inline head script to prevent FOUC; localStorage persistence |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| feed | ^5.2.0 | RSS 2.0 / Atom / JSON Feed generation | TypeScript, well-maintained, 1.1M+ weekly downloads, supports all syndication formats |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/typography | ^0.5.19 | Dark mode prose styles | Already installed; `prose-invert` class for dark mode text |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `feed` | `rss` (npm) | `rss` is RSS-only; `feed` also generates Atom + JSON Feed for free |
| Vercel serverless function | Express serves OG HTML | Won't work -- crawlers hit the Vercel domain, not Render |
| Vercel Edge Middleware | Serverless function | Edge Middleware requires Next.js-style `middleware.js`; serverless is simpler for Vite |

### No New Client Dependencies

Dark mode requires zero new packages. The `feed` package is server-side only.

**Installation:**
```bash
cd server && npm install feed
```

## Architecture Patterns

### SHAR-02: OG Meta Tags (Vercel Serverless Function)

**The problem:** Vercel serves the SPA's `index.html` for all routes. Social crawlers read this initial HTML. The HTML has no OG tags, so shared links show a blank preview.

**The solution:** A Vercel serverless function at `client/api/og.js` intercepts post permalink requests, fetches post data from the API, and replaces OG placeholders in `index.html` before serving.

**Architecture:**

```
Browser request: /posts/abc123
  -> Vercel filesystem check (no static file matches)
  -> Vercel rewrites: /posts/:slug -> /api/og
  -> Serverless function executes:
     1. Read dist/index.html (build artifact)
     2. Fetch post data from RENDER_API_URL/api/posts/abc123
     3. Replace __OG_TITLE__, __OG_DESCRIPTION__, __OG_IMAGE__ placeholders
     4. Return modified HTML with Content-Type: text/html
  -> Browser receives HTML with correct OG tags
  -> React hydrates and takes over routing
```

**Step 1: Add OG placeholders to `client/index.html`:**
```html
<head>
  <!-- Existing tags -->
  <meta property="og:title" content="__OG_TITLE__" />
  <meta property="og:description" content="__OG_DESCRIPTION__" />
  <meta property="og:image" content="__OG_IMAGE__" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="__OG_URL__" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="__OG_TITLE__" />
  <meta name="twitter:description" content="__OG_DESCRIPTION__" />
  <meta name="twitter:image" content="__OG_IMAGE__" />
</head>
```

**Step 2: Create `client/api/og.js` serverless function:**
```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the built index.html once (cold start)
const html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf8');

const SITE_URL = process.env.SITE_URL || 'https://involuntary-response.vercel.app';
const API_URL = process.env.RENDER_API_URL || 'https://involuntary-response-api.onrender.com';

const DEFAULTS = {
  title: 'Involuntary Response',
  description: 'Short-form music takes from people who care about music.',
  image: `${SITE_URL}/og-default.png`,
};

export default async function handler(req, res) {
  const slug = req.url.replace('/posts/', '').split('?')[0];

  let og = { ...DEFAULTS };

  if (slug) {
    try {
      const resp = await fetch(`${API_URL}/api/posts/${slug}`);
      if (resp.ok) {
        const post = await resp.json();
        og.title = `${post.author?.displayName} on ${post.embed?.title || 'music'} | Involuntary Response`;
        og.description = post.body.slice(0, 200);
        og.image = post.embed?.thumbnailUrl || DEFAULTS.image;
      }
    } catch {
      // Fall through to defaults
    }
  }

  const result = html
    .replace(/__OG_TITLE__/g, escapeHtml(og.title))
    .replace(/__OG_DESCRIPTION__/g, escapeHtml(og.description))
    .replace(/__OG_IMAGE__/g, og.image)
    .replace(/__OG_URL__/g, `${SITE_URL}/posts/${slug}`);

  res.setHeader('Content-Type', 'text/html');
  res.send(result);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

**Step 3: Update `client/vercel.json` routing:**
```json
{
  "rewrites": [
    { "source": "/posts/:slug", "destination": "/api/og" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Vercel processes rewrites in order. The `/posts/:slug` pattern matches first for post permalinks, routing to the serverless function. All other routes fall through to the SPA.

**Critical details:**
- Vercel checks the filesystem FIRST (static files and `/api/` functions), THEN applies rewrites
- The slug parameter is passed via `req.query.slug` (Vercel automatically extracts named params from rewrite patterns) or via `req.url`
- The serverless function returns the same SPA HTML, so browsers still get the full React app
- `og:image` must be an absolute URL (crawlers require this)
- The `thumbnailUrl` from Spotify oEmbed is the album artwork -- this is the image for social previews
- Apple Music embeds have `thumbnailUrl: null` -- fall back to a default OG image

**Environment variables needed on Vercel:**
- `SITE_URL` - The canonical frontend URL
- `RENDER_API_URL` - The Render API base URL

### SHAR-03: RSS Feed (Express Endpoint)

**Architecture:**

```
server/routes/feed.js
  GET /api/feed -> Query recent posts + embeds + tags
                -> Build Feed object with feed.addItem()
                -> Return feed.rss2() as XML
```

```javascript
import { Router } from 'express';
import { Feed } from 'feed';
import db from '../db/index.js';

const router = Router();
const SITE_URL = process.env.FRONTEND_URL || 'https://involuntary-response.vercel.app';

router.get('/', async (req, res) => {
  const feed = new Feed({
    title: 'Involuntary Response',
    description: 'Short-form music takes from people who care about music.',
    id: SITE_URL,
    link: SITE_URL,
    language: 'en',
    copyright: `${new Date().getFullYear()} Involuntary Response`,
  });

  const posts = await db.all(
    `SELECT p.id, p.slug, p.body, p.created_at,
            u.display_name AS author_display_name, u.username AS author_username
     FROM posts p
     JOIN users u ON p.author_id = u.id
     ORDER BY p.created_at DESC
     LIMIT 20`
  );

  // Batch-fetch embeds
  const postIds = posts.map(p => p.id);
  let embedMap = {};
  if (postIds.length > 0) {
    const ph = postIds.map(() => '?').join(',');
    const embeds = await db.all(
      `SELECT post_id, title, original_url FROM post_embeds WHERE post_id IN (${ph})`,
      ...postIds
    );
    for (const e of embeds) embedMap[e.post_id] = e;
  }

  for (const post of posts) {
    const embed = embedMap[post.id];
    const embedLink = embed ? `<p><a href="${embed.original_url}">${embed.title || 'Listen'}</a></p>` : '';

    feed.addItem({
      title: embed?.title
        ? `${post.author_display_name} on ${embed.title}`
        : `Post by ${post.author_display_name}`,
      id: `${SITE_URL}/posts/${post.slug}`,
      link: `${SITE_URL}/posts/${post.slug}`,
      description: post.body.slice(0, 200),
      content: `<p>${post.body}</p>${embedLink}`,
      date: new Date(post.created_at),
      author: [{ name: post.author_display_name }],
    });
  }

  res.set('Content-Type', 'application/rss+xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
  res.send(feed.rss2());
});

export default router;
```

Mount in `server/index.js`:
```javascript
import feedRoutes from './routes/feed.js';
app.use('/api/feed', feedRoutes);
```

**RSS feed link in client HTML:**
```html
<link rel="alternate" type="application/rss+xml" title="Involuntary Response" href="/api/feed" />
```

Note: The `/api/feed` URL from the client will proxy through Vite in dev (to localhost:3001) and in production the client can link to the full Render API URL, or a Vercel rewrite can proxy it.

### DSGN-03: Dark Mode (ThemeContext + Tailwind)

**Architecture:**

```
client/src/
├── context/ThemeContext.jsx   # Theme state, toggle, system detection
├── index.html                 # Inline <script> in <head> for FOUC prevention
├── index.css                  # Dark mode body styles
└── components/Navbar.jsx      # Theme toggle button
```

**ThemeContext pattern (three-way: light / dark / system):**

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

function getEffectiveTheme(stored) {
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  // 'system' or unset -- check OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(
    () => localStorage.getItem('theme') || 'system'
  );

  useEffect(() => {
    applyTheme(getEffectiveTheme(preference));
  }, [preference]);

  // Listen for OS theme changes when in 'system' mode
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(getEffectiveTheme('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const setTheme = (value) => {
    if (value === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', value);
    }
    setPreference(value);
  };

  return (
    <ThemeContext.Provider value={{ preference, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

**FOUC prevention (inline script in `<head>` of `index.html`):**

```html
<script>
  (function() {
    var t = localStorage.getItem('theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  })();
</script>
```

This runs synchronously before React renders, so the page never flashes the wrong theme.

**Where dark: classes are needed:**

Every component using hardcoded colors needs a `dark:` variant. Key files:

| File | Light | Dark |
|------|-------|------|
| `index.css` body | `bg-[#fafafa] text-[#1a1a1a]` | `dark:bg-gray-950 dark:text-gray-100` |
| `Navbar.jsx` | `bg-white border-gray-200` | `dark:bg-gray-900 dark:border-gray-800` |
| `PostCard.jsx` | `text-gray-400`, `text-gray-500` | `dark:text-gray-500`, `dark:text-gray-400` |
| `ViewPost.jsx` | `text-gray-400` | `dark:text-gray-500` |
| `Home.jsx` | `text-gray-400`, `text-gray-500` | `dark:text-gray-500`, `dark:text-gray-400` |
| `EmbedPlaceholder.jsx` | Background/border colors | Dark equivalents |
| Prose (typography) | `prose-gray` | `dark:prose-invert` (built into @tailwindcss/typography) |
| All pages | Various `text-gray-*`, `bg-white`, `border-gray-*` | Dark counterparts |

**Toggle UI (Navbar):**

A simple icon button that cycles through system -> light -> dark. Use inline SVG icons (sun/moon/monitor) to avoid adding a dependency.

### Recommended Project Structure (additions only)

```
client/
├── api/
│   └── og.js              # Vercel serverless function for OG meta tags
├── public/
│   └── og-default.png     # Default OG image (fallback when no embed thumbnail)
├── src/
│   └── context/
│       └── ThemeContext.jsx  # Dark mode state management
└── vercel.json              # Updated with /posts/:slug rewrite

server/
└── routes/
    └── feed.js              # RSS feed endpoint
```

### Anti-Patterns to Avoid
- **react-helmet for OG tags:** Social crawlers do not execute JavaScript. React Helmet updates the DOM after hydration, which crawlers never see. Use server-side injection instead.
- **Client-side dark mode class toggling without FOUC script:** Users see a flash of white before dark mode applies. The inline `<head>` script is essential.
- **Storing theme as `true`/`false` in localStorage:** Use `'light'` / `'dark'` / remove key for system. This enables the three-way toggle and matches the Tailwind docs pattern exactly.
- **Generating RSS on every request without caching:** Set `Cache-Control: public, max-age=3600` on the RSS endpoint. Feed content changes slowly (new posts every few hours/days).
- **Relative URLs in OG image or RSS links:** Both OG meta tags and RSS require absolute URLs with protocol and hostname. Always prefix with `SITE_URL`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS XML generation | Manual XML string concatenation | `feed` npm package | XML escaping, date formatting (RFC-822), proper RSS 2.0 spec compliance, Atom/JSON Feed for free |
| OG tag injection | Custom HTML parser | String placeholder replacement (`__OG_TITLE__` -> real value) | Simple regex replace is sufficient; no need for DOM parsing |
| Theme toggle persistence | Custom cookie system | `localStorage.getItem('theme')` | Browser-standard, synchronous read, no server round-trip |
| Prose dark mode | Manual color overrides for every text element | `dark:prose-invert` from @tailwindcss/typography | Already installed; handles all prose element inversions automatically |

**Key insight:** All three features in this phase have well-established patterns. The complexity is in the wiring (Vercel routing, Express mounting, Tailwind class propagation), not in the individual implementations.

## Common Pitfalls

### Pitfall 1: Vercel Rewrite Order Breaks SPA Routing
**What goes wrong:** Adding the `/posts/:slug -> /api/og` rewrite but breaking the catch-all SPA rewrite for other routes.
**Why it happens:** Vercel processes rewrites in order, and filesystem takes priority. If the serverless function errors, the user sees a 500 instead of the SPA.
**How to avoid:** Put specific rewrites BEFORE the catch-all. Test all routes after deployment: `/`, `/explore`, `/posts/slug`, `/tag/name`, `/u/username`.
**Warning signs:** Non-post routes returning 404 or 500 after deployment.

### Pitfall 2: OG Image URL Is Relative
**What goes wrong:** Social crawlers show a broken image or no image in the preview.
**Why it happens:** Using a relative path like `/og-default.png` instead of `https://domain.com/og-default.png` in the `og:image` meta tag.
**How to avoid:** Always construct OG image URLs with the full `SITE_URL` prefix. Verify with opengraph.xyz or Twitter Card Validator.
**Warning signs:** Previews show correct title/description but no image.

### Pitfall 3: Spotify Thumbnail URL Might Be Null
**What goes wrong:** OG image tag is empty or contains "null" as string.
**Why it happens:** Spotify oEmbed metadata fetch is non-fatal (Phase 2 decision). Some posts have `thumbnailUrl: null` in the database.
**How to avoid:** Always fall back to the default OG image: `post.embed?.thumbnailUrl || DEFAULTS.image`.
**Warning signs:** Some shared posts show images, others don't.

### Pitfall 4: Flash of Wrong Theme (FOUC)
**What goes wrong:** Page briefly shows light mode before switching to dark (or vice versa).
**Why it happens:** React hasn't hydrated yet, so the ThemeContext effect hasn't run. The `<html>` element has no `dark` class during initial render.
**How to avoid:** Add the inline `<script>` in `<head>` (before `<body>`) that synchronously reads localStorage and sets the `dark` class.
**Warning signs:** Brief white flash on page load when dark mode is active.

### Pitfall 5: RSS Feed Links Point to Wrong Domain
**What goes wrong:** RSS items link to the API domain (Render) instead of the frontend domain (Vercel).
**Why it happens:** Using `req.headers.host` or a hardcoded localhost URL instead of the `FRONTEND_URL` environment variable.
**How to avoid:** Always use `process.env.FRONTEND_URL` for constructing post links in RSS items.
**Warning signs:** Clicking an RSS item opens the Render API URL instead of the website.

### Pitfall 6: Dark Mode Colors Missed in Some Components
**What goes wrong:** Some UI elements remain light-colored in dark mode (white backgrounds, dark-on-dark text).
**Why it happens:** Not adding `dark:` variants to all hardcoded color classes across all pages and components.
**How to avoid:** Audit every file that uses `bg-white`, `bg-[#fafafa]`, `text-gray-*`, `border-gray-*`, and `text-[#1a1a1a]`. Use find/replace systematically.
**Warning signs:** Elements that look fine in light mode but are unreadable in dark mode.

## Code Examples

### Vercel Serverless Function for OG Tags
```javascript
// client/api/og.js
// Source: Vercel docs + VibeIt blog pattern (verified approach)

import { readFileSync } from 'fs';
import { join } from 'path';

let cachedHtml;
function getHtml() {
  if (!cachedHtml) {
    cachedHtml = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  }
  return cachedHtml;
}

const SITE_URL = process.env.SITE_URL || 'https://involuntary-response.vercel.app';
const API_URL = process.env.RENDER_API_URL;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const slug = url.pathname.replace(/^\/posts\//, '');

  let title = 'Involuntary Response';
  let description = 'Short-form music takes from people who care about music.';
  let image = `${SITE_URL}/og-default.png`;

  if (slug && API_URL) {
    try {
      const resp = await fetch(`${API_URL}/api/posts/${slug}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const post = await resp.json();
        const embedTitle = post.embed?.title;
        title = embedTitle
          ? `${post.author?.displayName} on ${embedTitle}`
          : `${post.author?.displayName} | Involuntary Response`;
        description = post.body.slice(0, 200);
        image = post.embed?.thumbnailUrl || image;
      }
    } catch {
      // Defaults are fine
    }
  }

  const html = getHtml()
    .replace(/__OG_TITLE__/g, escapeHtml(title))
    .replace(/__OG_DESCRIPTION__/g, escapeHtml(description))
    .replace(/__OG_IMAGE__/g, image)
    .replace(/__OG_URL__/g, `${SITE_URL}/posts/${slug}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.send(html);
}
```

### RSS Feed Express Route
```javascript
// server/routes/feed.js
// Source: feed npm package docs (https://github.com/jpmonette/feed)

import { Router } from 'express';
import { Feed } from 'feed';
import db from '../db/index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const feed = new Feed({
      title: 'Involuntary Response',
      description: 'Short-form music takes from people who care about music.',
      id: siteUrl,
      link: siteUrl,
      language: 'en',
      copyright: `${new Date().getFullYear()} Involuntary Response`,
    });

    const posts = await db.all(
      `SELECT p.id, p.slug, p.body, p.created_at,
              u.display_name AS author_display_name
       FROM posts p JOIN users u ON p.author_id = u.id
       ORDER BY p.created_at DESC LIMIT 20`
    );

    const postIds = posts.map(p => p.id);
    let embedMap = {};
    if (postIds.length > 0) {
      const ph = postIds.map(() => '?').join(',');
      const embeds = await db.all(
        `SELECT post_id, title, original_url FROM post_embeds WHERE post_id IN (${ph})`,
        ...postIds
      );
      for (const e of embeds) embedMap[e.post_id] = e;
    }

    for (const post of posts) {
      const embed = embedMap[post.id];
      const embedLink = embed?.original_url
        ? `<p><a href="${embed.original_url}">${embed.title || 'Listen'}</a></p>`
        : '';

      feed.addItem({
        title: embed?.title
          ? `${post.author_display_name} on ${embed.title}`
          : `Post by ${post.author_display_name}`,
        id: `${siteUrl}/posts/${post.slug}`,
        link: `${siteUrl}/posts/${post.slug}`,
        description: post.body.slice(0, 200),
        content: `<p>${post.body}</p>${embedLink}`,
        date: new Date(post.created_at),
        author: [{ name: post.author_display_name }],
      });
    }

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(feed.rss2());
  } catch (err) {
    console.error('RSS feed error:', err);
    res.status(500).send('Feed generation failed');
  }
});

export default router;
```

### Dark Mode FOUC Prevention Script
```html
<!-- In client/index.html <head>, before </head> -->
<script>
  (function() {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

### Theme Toggle Component Pattern
```jsx
// Navbar.jsx theme toggle (inline SVG icons, no dependency)
function ThemeToggle() {
  const { preference, setTheme } = useTheme();

  const next = { system: 'light', light: 'dark', dark: 'system' };
  const labels = { system: 'System', light: 'Light', dark: 'Dark' };

  return (
    <button
      onClick={() => setTheme(next[preference])}
      className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition"
      title={`Theme: ${labels[preference]}`}
    >
      {/* Sun / Moon / Monitor icon based on preference */}
    </button>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Helmet for OG tags | Vercel serverless function with placeholder replacement | 2024+ | Crawlers actually see OG tags; Helmet never worked for bots |
| Manual RSS XML strings | `feed` package (v5.x) | 2023 | Type-safe, spec-compliant, multi-format support |
| `prefers-color-scheme` media query only | Class-based toggle with localStorage + system fallback | Tailwind v2+ | User override persists; three-way control (system/light/dark) |
| `darkMode: 'media'` in Tailwind | `darkMode: 'class'` (already configured) | Tailwind v2+ | Enables manual toggle alongside system detection |

**Deprecated/outdated:**
- `react-helmet` / `react-helmet-async` for OG tags: Does not work for social crawlers
- `darkMode: 'media'` in Tailwind config: Cannot be toggled manually; no persistence
- `node-rss` package: Still works but less maintained than `feed`; RSS-only output

## Open Questions

1. **Default OG image asset**
   - What we know: Need a fallback image when posts have no embed thumbnail (Apple Music posts, failed Spotify metadata)
   - What's unclear: What the default image should be (site logo? Text treatment? Solid color with brand?)
   - Recommendation: Create a simple 1200x630 PNG with the site name "Involuntary Response" on a dark background. Place at `client/public/og-default.png`.

2. **RSS feed discovery from Vercel frontend**
   - What we know: RSS `<link>` tag in `index.html` needs to point to the feed endpoint on Render
   - What's unclear: Whether to use the Render API URL directly or proxy through Vercel
   - Recommendation: Use a Vercel rewrite (`/feed` -> Render API `/api/feed`) so the RSS URL stays on the same domain as the site. If too complex, link directly to the Render URL.

3. **Vercel environment variables for serverless function**
   - What we know: The OG serverless function needs `SITE_URL` and `RENDER_API_URL`
   - What's unclear: Whether these are already configured in Vercel dashboard
   - Recommendation: Add them during deployment. `SITE_URL` is the Vercel frontend domain; `RENDER_API_URL` is the Render API domain.

## Sources

### Primary (HIGH confidence)
- [Vercel vercel.json documentation](https://vercel.com/docs/project-configuration/vercel-json) - Rewrites syntax, filesystem priority, pattern matching
- [Tailwind CSS dark mode documentation](https://tailwindcss.com/docs/dark-mode) - `darkMode: 'class'`, localStorage pattern, FOUC prevention script
- [feed npm package](https://github.com/jpmonette/feed) - v5.2.0, API usage, RSS/Atom/JSON Feed generation

### Secondary (MEDIUM confidence)
- [Dynamic OG Tags for React SPA on Vercel (VibeIt Blog)](https://blog.vibeit.hr/blog/dynamic-og-tags) - Serverless function approach, placeholder replacement, vercel.json routing
- [Adding social previews without SSR](https://mtg-dev.tech/blog/adding-social-previews-without-ssr) - Edge function pattern for OG injection

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `feed` is the established choice, zero new client dependencies needed
- Architecture (OG tags): HIGH - Vercel serverless function with placeholder replacement is the documented approach for Vite SPAs; verified with Vercel docs
- Architecture (RSS): HIGH - Standard Express endpoint with established package; identical to patterns used across the Node.js ecosystem
- Architecture (dark mode): HIGH - Tailwind config already has `darkMode: 'class'`; pattern is from official Tailwind docs
- Pitfalls: HIGH - Based on verified deployment architecture and existing codebase inspection

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable patterns, no fast-moving dependencies)
