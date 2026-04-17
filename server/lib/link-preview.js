/**
 * Open Graph link preview fetcher.
 *
 * Fetches a URL, parses OG/Twitter meta tags, returns structured preview data.
 * Includes basic SSRF defenses: protocol allowlist, private IP block, size cap.
 */

const MAX_BYTES = 512 * 1024; // 512KB cap on HTML body
const FETCH_TIMEOUT_MS = 5000;

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isPrivateHost(hostname) {
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(hostname));
}

function decodeHtmlEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractMeta(html, propertyOrName) {
  // Match <meta property="og:title" content="..."> or name= variant, attrs in any order
  const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${escaped}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1].trim());
  }
  return null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

export async function fetchLinkPreview(url) {
  if (!url || typeof url !== 'string') return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (isPrivateHost(parsed.hostname)) return null;

  let resp;
  try {
    resp = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
  } catch {
    return null;
  }

  if (!resp.ok) return null;

  const ct = resp.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return null;

  // Read up to MAX_BYTES
  const reader = resp.body?.getReader();
  if (!reader) return null;

  let received = 0;
  const chunks = [];
  try {
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      chunks.push(value);
      if (received >= MAX_BYTES) break;
    }
  } finally {
    try { await reader.cancel(); } catch { /* noop */ }
  }

  const buf = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c.subarray(0, Math.min(c.length, received - offset)), offset);
    offset += c.length;
    if (offset >= received) break;
  }
  const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);

  const title =
    extractMeta(html, 'og:title') ||
    extractMeta(html, 'twitter:title') ||
    extractTitle(html);

  const description =
    extractMeta(html, 'og:description') ||
    extractMeta(html, 'twitter:description') ||
    extractMeta(html, 'description');

  const image =
    extractMeta(html, 'og:image') ||
    extractMeta(html, 'twitter:image');

  const siteName =
    extractMeta(html, 'og:site_name') ||
    parsed.hostname.replace(/^www\./, '');

  // Resolve relative image URLs
  let absImage = null;
  if (image) {
    try {
      absImage = new URL(image, parsed.origin).toString();
    } catch {
      absImage = null;
    }
  }

  if (!title && !absImage) return null;

  return {
    title: title || siteName,
    description: description || null,
    image: absImage,
    siteName,
    url: parsed.toString(),
  };
}
