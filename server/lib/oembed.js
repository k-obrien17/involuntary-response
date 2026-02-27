/**
 * Universal oEmbed resolver with provider registry.
 * Fetches embed HTML from provider oEmbed endpoints, with manual
 * fallback for Apple Music (no oEmbed support).
 */

const PROVIDERS = [
  {
    name: 'spotify',
    urlPattern: /https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/,
    oembedUrl: (url) =>
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'youtube',
    urlPattern: /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    oembedUrl: (url) =>
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  },
  {
    name: 'vimeo',
    urlPattern: /https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
    oembedUrl: (url) =>
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'soundcloud',
    urlPattern: /https?:\/\/soundcloud\.com\/[^/]+\/[^/]+/,
    oembedUrl: (url) =>
      `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  },
  {
    name: 'bandcamp',
    urlPattern: /https?:\/\/[a-zA-Z0-9-]+\.bandcamp\.com\/(track|album)\/[a-zA-Z0-9-]+/,
    oembedUrl: (url) =>
      `https://bandcamp.com/api/fancyoembed/1/oembed?url=${encodeURIComponent(url)}&format=json`,
  },
  {
    name: 'apple',
    urlPattern: /https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|playlist|song)\/[^/]+\/([0-9]+)(\?i=([0-9]+))?/,
    // Apple Music has no oEmbed — handled manually in resolveEmbed
    oembedUrl: null,
  },
];

const ALLOWED_EMBED_DOMAINS = [
  'open.spotify.com',
  'www.youtube.com',
  'player.vimeo.com',
  'w.soundcloud.com',
  'bandcamp.com',
  'embed.music.apple.com',
];

export function sanitizeEmbedHtml(html) {
  if (!html || typeof html !== 'string') return null;

  // Extract the first <iframe> tag
  const iframeMatch = html.match(/<iframe\s[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/i);
  if (!iframeMatch) return null;

  const src = iframeMatch[1];

  // Validate src is HTTPS on an allowed domain
  let parsed;
  try {
    parsed = new URL(src);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;

  const domainAllowed = ALLOWED_EMBED_DOMAINS.some(
    (d) => parsed.hostname === d || parsed.hostname.endsWith('.' + d)
  );
  if (!domainAllowed) return null;

  // Return only the iframe tag itself (strip any surrounding markup)
  return iframeMatch[0];
}

function buildAppleMusicEmbed(url) {
  const match = url.match(
    /https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|playlist|song)\/[^/]+\/([0-9]+)(\?i=([0-9]+))?/
  );
  if (!match) return null;

  const [, region, type, collectionId, , songId] = match;
  const embedType = songId ? 'song' : type;
  let embedUrl = `https://embed.music.apple.com/${region}/${type}/x/${collectionId}`;
  if (songId) embedUrl += `?i=${songId}`;

  const height = embedType === 'song' ? 175 : 450;
  const embedHtml = `<iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" allow="autoplay *; encrypted-media *; fullscreen *; picture-in-picture *" loading="lazy"></iframe>`;

  return {
    provider: 'apple',
    embedType,
    embedUrl,
    originalUrl: url,
    title: null,
    thumbnailUrl: null,
    embedHtml,
  };
}

export async function resolveEmbed(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  for (const provider of PROVIDERS) {
    const match = trimmed.match(provider.urlPattern);
    if (!match) continue;

    // Apple Music — manual construction
    if (provider.name === 'apple') {
      return buildAppleMusicEmbed(trimmed);
    }

    // All others — fetch oEmbed JSON
    if (!provider.oembedUrl) continue;

    try {
      const resp = await fetch(provider.oembedUrl(trimmed), {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return null;

      const data = await resp.json();
      const embedHtml = sanitizeEmbedHtml(data.html);

      return {
        provider: provider.name,
        embedType: data.type || 'rich',
        embedUrl: trimmed,
        originalUrl: trimmed,
        title: data.title || null,
        thumbnailUrl: data.thumbnail_url || null,
        embedHtml,
      };
    } catch {
      return null;
    }
  }

  return null;
}

export const SUPPORTED_PROVIDERS = PROVIDERS.map((p) => p.name);
