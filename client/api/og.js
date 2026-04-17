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
    let bodyContent = '';
    let jsonLd = '';

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

          const paragraphs = (post.body || '').split(/\n{2,}/).filter(Boolean);
          bodyContent = `<article>`;
          if (post.category) {
            bodyContent += `<p><strong>${escapeHtml(post.category.name)}</strong></p>`;
          }
          for (const p of paragraphs) {
            bodyContent += `<p>${escapeHtml(p)}</p>`;
          }
          if (post.embed?.title) {
            bodyContent += `<p>Listening to: <em>${escapeHtml(post.embed.title)}</em></p>`;
          }
          if (post.artists?.length > 0) {
            bodyContent += `<p>Artists: ${post.artists.map((a) => escapeHtml(a.name)).join(', ')}</p>`;
          }
          if (post.tags?.length > 0) {
            bodyContent += `<p>Tags: ${post.tags.map((t) => escapeHtml(t)).join(', ')}</p>`;
          }
          if (post.author) {
            bodyContent += `<p>By <a href="${SITE_URL}/u/${escapeHtml(post.author.username)}">${escapeHtml(post.author.displayName)}</a></p>`;
          }
          bodyContent += `</article>`;

          jsonLd = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.embed?.title || post.body?.slice(0, 110),
            description: post.body?.slice(0, 200),
            url,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt || post.publishedAt,
            author: {
              '@type': 'Person',
              name: post.author?.displayName,
              url: `${SITE_URL}/u/${post.author?.username}`,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Involuntary Response',
              url: SITE_URL,
            },
            ...(post.embed?.thumbnailUrl && { image: post.embed.thumbnailUrl }),
            ...(post.artists?.length > 0 && {
              about: post.artists.map((a) => ({
                '@type': 'MusicGroup',
                name: a.name,
              })),
            }),
          });
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
      const fallbackBody = bodyContent || '';
      const fallbackLd = jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : '';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html><html><head><meta property="og:title" content="${safeTitle}"/><meta property="og:description" content="${safeDescription}"/><meta property="og:image" content="${safeImage}"/><meta property="og:url" content="${safeUrl}"/><meta property="og:type" content="${ogType}"/><link rel="canonical" href="${safeUrl}"/>${fallbackLd}</head><body>${fallbackBody}<script>window.location.href="${safeUrl}";</script></body></html>`);
    }

    html = html.replace('Involuntary Response</title>', `${safeTitle}</title>`);
    html = html.replace(/<link rel="canonical"[^>]*\/>/, `<link rel="canonical" href="${safeUrl}" />`);
    html = html.replace(/content="Involuntary Response"/, `content="${safeTitle}"`);
    html = html.replace(/content="Short-form music takes from people who care about music\."/g, `content="${safeDescription}"`);
    html = html.replace(/content="https:\/\/www\.involuntaryresponse\.com\/og-default\.png"/g, `content="${safeImage}"`);
    html = html.replace(/content="https:\/\/www\.involuntaryresponse\.com\/"/g, `content="${safeUrl}"`);
    html = html.replace(/content="website"/, `content="${ogType}"`);

    if (bodyContent) {
      html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
    }
    if (jsonLd) {
      html = html.replace('</head>', `<script type="application/ld+json">${jsonLd}</script></head>`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch {
    res.status(302).setHeader('Location', '/').end();
  }
}
