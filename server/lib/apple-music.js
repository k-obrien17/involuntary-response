/**
 * Apple Music artist extraction via iTunes Search API.
 * No API key required — public REST endpoint.
 */

/**
 * Parse an Apple Music URL to extract region, type, collectionId, and optional songId.
 * @param {string} url - Apple Music URL
 * @returns {{ region: string, type: string, collectionId: string, songId: string | null } | null}
 */
export function parseAppleMusicUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|playlist|song)\/[^/]+\/([0-9]+)(\?i=([0-9]+))?/
  );
  if (!match) return null;
  return {
    region: match[1],
    type: match[2],
    collectionId: match[3],
    songId: match[5] || null,
  };
}

/**
 * Fetch artist names for a given Apple Music URL via iTunes Search API.
 * Returns empty array on any failure (non-fatal, same pattern as Spotify).
 * @param {string} url - Apple Music URL
 * @returns {Promise<Array<{ name: string }>>}
 */
export async function getArtistsForAppleMusicUrl(url) {
  const parsed = parseAppleMusicUrl(url);
  if (!parsed) return [];

  try {
    // For songs with a songId, look up the specific song; otherwise look up the album/collection
    const lookupId = parsed.songId || parsed.collectionId;
    const entity = parsed.songId ? 'song' : 'album';
    const apiUrl = `https://itunes.apple.com/lookup?id=${lookupId}&entity=${entity}`;

    const resp = await fetch(apiUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return [];

    const data = await resp.json();
    if (!data.results || data.results.length === 0) return [];

    const artistName = data.results[0].artistName;
    if (!artistName) return [];

    return [{ name: artistName }];
  } catch {
    return [];
  }
}
