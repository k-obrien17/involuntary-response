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

async function fetchApi(renderApiUrl, endpoint) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${renderApiUrl}${endpoint}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function buildResponse(res, { title, description, image, url, ogType, bodyContent, jsonLd }) {
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
    return res.status(200).send(`<!DOCTYPE html><html><head><meta property="og:title" content="${safeTitle}"/><meta property="og:description" content="${safeDescription}"/><meta property="og:image" content="${safeImage}"/><meta property="og:url" content="${safeUrl}"/><meta property="og:type" content="${ogType}"/><link rel="canonical" href="${safeUrl}"/><title>${safeTitle}</title>${fallbackLd}</head><body>${fallbackBody}</body></html>`);
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
}

async function handlePost(slug, siteUrl, renderApiUrl) {
  const post = await fetchApi(renderApiUrl, `/api/posts/${slug}`);
  if (!post) return null;

  let title = 'Involuntary Response';
  if (post.embed?.title && post.author?.displayName) {
    title = `${post.author.displayName} on ${post.embed.title} | Involuntary Response`;
  } else if (post.author?.displayName) {
    title = `Post by ${post.author.displayName} | Involuntary Response`;
  }

  const description = post.body?.slice(0, 200) || '';
  const image = post.embed?.thumbnailUrl || `${siteUrl}/og-default.png`;

  const paragraphs = (post.body || '').split(/\n{2,}/).filter(Boolean);
  let bodyContent = '<article>';
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
    bodyContent += `<p>By <a href="${siteUrl}/u/${escapeHtml(post.author.username)}">${escapeHtml(post.author.displayName)}</a></p>`;
  }
  bodyContent += '</article>';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.embed?.title || post.body?.slice(0, 110),
    description: post.body?.slice(0, 200),
    url: `${siteUrl}/posts/${slug}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author?.displayName,
      url: `${siteUrl}/u/${post.author?.username}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Involuntary Response',
      url: siteUrl,
    },
    ...(post.embed?.thumbnailUrl && { image: post.embed.thumbnailUrl }),
    ...(post.artists?.length > 0 && {
      about: post.artists.map((a) => ({ '@type': 'MusicGroup', name: a.name })),
    }),
  });

  return { title, description, image, ogType: 'article', bodyContent, jsonLd };
}

async function handleArtist(name, siteUrl, renderApiUrl) {
  const data = await fetchApi(renderApiUrl, `/api/browse/artist/${encodeURIComponent(name)}`);
  if (!data) return null;

  const title = `${data.artist.name} — posts on Involuntary Response`;
  const description = `${data.artist.postCount || 0} posts about ${data.artist.name}. Short-form music takes.`;

  let bodyContent = `<h1>${escapeHtml(data.artist.name)}</h1>`;
  bodyContent += `<p>${data.artist.postCount || 0} posts</p>`;
  if (data.posts?.length > 0) {
    bodyContent += '<ul>';
    for (const p of data.posts.slice(0, 5)) {
      bodyContent += `<li><a href="${siteUrl}/posts/${escapeHtml(p.slug)}">${escapeHtml(p.body.slice(0, 100))}</a></li>`;
    }
    bodyContent += '</ul>';
  }

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Posts about ${data.artist.name}`,
    url: `${siteUrl}/artist/${encodeURIComponent(name)}`,
    about: { '@type': 'MusicGroup', name: data.artist.name },
  });

  return { title, description, image: data.artist.image || `${siteUrl}/og-default.png`, ogType: 'website', bodyContent, jsonLd };
}

async function handleTag(tag, siteUrl, renderApiUrl) {
  const data = await fetchApi(renderApiUrl, `/api/browse/tag/${encodeURIComponent(tag)}`);
  if (!data) return null;

  const title = `#${tag} — Involuntary Response`;
  const description = `Posts tagged "${tag}". Short-form music takes from people who care about music.`;

  let bodyContent = `<h1>Posts tagged "${escapeHtml(tag)}"</h1>`;
  if (data.posts?.length > 0) {
    bodyContent += '<ul>';
    for (const p of data.posts.slice(0, 5)) {
      bodyContent += `<li><a href="${siteUrl}/posts/${escapeHtml(p.slug)}">${escapeHtml(p.body.slice(0, 100))}</a></li>`;
    }
    bodyContent += '</ul>';
  }

  return { title, description, image: `${siteUrl}/og-default.png`, ogType: 'website', bodyContent, jsonLd: '' };
}

async function handleProfile(username, siteUrl, renderApiUrl) {
  const data = await fetchApi(renderApiUrl, `/api/profile/${encodeURIComponent(username)}/profile`);
  if (!data) return null;

  const title = `${data.user.displayName} — Involuntary Response`;
  const description = data.user.bio || `${data.user.postCount || 0} posts by ${data.user.displayName}.`;

  let bodyContent = `<h1>${escapeHtml(data.user.displayName)}</h1>`;
  if (data.user.bio) {
    bodyContent += `<p>${escapeHtml(data.user.bio)}</p>`;
  }
  bodyContent += `<p>${data.user.postCount || 0} posts</p>`;
  if (data.posts?.length > 0) {
    bodyContent += '<ul>';
    for (const p of data.posts.slice(0, 5)) {
      bodyContent += `<li><a href="${siteUrl}/posts/${escapeHtml(p.slug)}">${escapeHtml(p.body.slice(0, 100))}</a></li>`;
    }
    bodyContent += '</ul>';
  }

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: data.user.displayName,
    url: `${siteUrl}/u/${username}`,
    mainEntity: {
      '@type': 'Person',
      name: data.user.displayName,
      description: data.user.bio || undefined,
    },
  });

  return { title, description, image: `${siteUrl}/og-default.png`, ogType: 'profile', bodyContent, jsonLd };
}

async function handleCategory(slug, siteUrl, renderApiUrl) {
  const data = await fetchApi(renderApiUrl, `/api/browse/category/${encodeURIComponent(slug)}`);
  if (!data) return null;

  const name = data.category?.name || slug;
  const title = `${name} — Involuntary Response`;
  const description = `Posts in the "${name}" category. Short-form music takes.`;

  let bodyContent = `<h1>${escapeHtml(name)}</h1>`;
  if (data.posts?.length > 0) {
    bodyContent += '<ul>';
    for (const p of data.posts.slice(0, 5)) {
      bodyContent += `<li><a href="${siteUrl}/posts/${escapeHtml(p.slug)}">${escapeHtml(p.body.slice(0, 100))}</a></li>`;
    }
    bodyContent += '</ul>';
  }

  return { title, description, image: `${siteUrl}/og-default.png`, ogType: 'website', bodyContent, jsonLd: '' };
}

export default async function handler(req, res) {
  try {
    const SITE_URL = process.env.SITE_URL || 'https://www.involuntaryresponse.com';
    const RENDER_API_URL = process.env.RENDER_API_URL;

    const path = req.url.split('?')[0];
    const url = `${SITE_URL}${path}`;

    let meta = null;

    const postMatch = path.match(/^\/posts\/([^/]+)$/);
    const artistMatch = path.match(/^\/artist\/([^/]+)$/);
    const tagMatch = path.match(/^\/tag\/([^/]+)$/);
    const profileMatch = path.match(/^\/u\/([^/]+)$/);
    const categoryMatch = path.match(/^\/category\/([^/]+)$/);

    try {
      if (postMatch && postMatch[1] !== 'new' && RENDER_API_URL) {
        meta = await handlePost(postMatch[1], SITE_URL, RENDER_API_URL);
      } else if (artistMatch && RENDER_API_URL) {
        meta = await handleArtist(decodeURIComponent(artistMatch[1]), SITE_URL, RENDER_API_URL);
      } else if (tagMatch && RENDER_API_URL) {
        meta = await handleTag(decodeURIComponent(tagMatch[1]), SITE_URL, RENDER_API_URL);
      } else if (profileMatch && RENDER_API_URL) {
        meta = await handleProfile(decodeURIComponent(profileMatch[1]), SITE_URL, RENDER_API_URL);
      } else if (categoryMatch && RENDER_API_URL) {
        meta = await handleCategory(decodeURIComponent(categoryMatch[1]), SITE_URL, RENDER_API_URL);
      }
    } catch {
      // API handler failed — fall through to static meta or defaults
    }

    if (!meta && path === '/about') {
      meta = {
        title: 'About — Involuntary Response',
        description: 'A place for visceral, honest reactions to music. Not reviews. Not ratings. Someone heard a song and needed to write about it.',
        image: `${SITE_URL}/og-default.png`,
        ogType: 'website',
        bodyContent: '<h1>About Involuntary Response</h1><p>A place for visceral, honest reactions to music. Not reviews. Not ratings. Someone heard a song and needed to write about it.</p>',
        jsonLd: '',
      };
    } else if (!meta && path === '/explore') {
      meta = {
        title: 'Explore — Involuntary Response',
        description: 'Discover artists, tags, and contributors. Short-form music takes from people who care about music.',
        image: `${SITE_URL}/og-default.png`,
        ogType: 'website',
        bodyContent: '<h1>Explore</h1><p>Discover artists, tags, and contributors on Involuntary Response.</p>',
        jsonLd: '',
      };
    }

    if (!meta) {
      meta = {
        title: 'Involuntary Response',
        description: 'Short-form music takes from people who care about music.',
        image: `${SITE_URL}/og-default.png`,
        ogType: 'website',
        bodyContent: '',
        jsonLd: '',
      };
    }

    meta.url = url;
    buildResponse(res, meta);
  } catch {
    res.status(302).setHeader('Location', '/').end();
  }
}
