import { readFileSync } from 'fs';
import { join } from 'path';

let cachedHtml = null;

function getHtml() {
  if (cachedHtml) return cachedHtml;
  const htmlPath = join(process.cwd(), 'dist', 'index.html');
  cachedHtml = readFileSync(htmlPath, 'utf-8');
  return cachedHtml;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  try {
    const SITE_URL = process.env.SITE_URL || 'https://www.involuntaryresponse.com';
    const RENDER_API_URL = process.env.RENDER_API_URL;

    const path = req.url.split('?')[0];
    const postMatch = path.match(/^\/posts\/([^/]+)$/);
    const isPostRoute = postMatch && postMatch[1] !== 'new';
    const slug = isPostRoute ? postMatch[1] : null;

    let title = 'Involuntary Response';
    let description = 'Short-form music takes from people who care about music.';
    let image = `${SITE_URL}/og-default.png`;
    let url = `${SITE_URL}${path}`;
    let ogType = 'website';

    if (isPostRoute && RENDER_API_URL && slug) {
      ogType = 'article';
      try {
        const response = await fetch(`${RENDER_API_URL}/api/posts/${slug}`, {
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const post = await response.json();

          if (post.embed?.title && post.author?.displayName) {
            title = `${post.author.displayName} on ${post.embed.title} | Involuntary Response`;
          } else if (post.author?.displayName) {
            title = `${post.author.displayName} | Involuntary Response`;
          }

          if (post.body) {
            description = post.body.slice(0, 200);
          }

          if (post.embed?.thumbnailUrl) {
            image = post.embed.thumbnailUrl;
          }
        }
      } catch {
        // Fetch failed or timed out — use defaults
      }
    }

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeImage = escapeHtml(image);
    const safeUrl = escapeHtml(url);

    let html;
    try {
      html = getHtml();
    } catch {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html><html><head><meta property="og:title" content="${safeTitle}"/><meta property="og:description" content="${safeDescription}"/><meta property="og:image" content="${safeImage}"/><meta property="og:url" content="${safeUrl}"/><meta property="og:type" content="${ogType}"/></head><body><script>window.location.href="${safeUrl}";</script></body></html>`);
    }

    html = html.replace(/__OG_TITLE__/g, safeTitle);
    html = html.replace(/__OG_DESCRIPTION__/g, safeDescription);
    html = html.replace(/__OG_IMAGE__/g, safeImage);
    html = html.replace(/__OG_URL__/g, safeUrl);
    html = html.replace(/__OG_TYPE__/g, ogType);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch {
    res.status(302).setHeader('Location', '/').end();
  }
}
