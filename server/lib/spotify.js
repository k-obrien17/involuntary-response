/**
 * Shared Spotify token cache and artist extraction utilities.
 * Used by browse/discovery features to store artist data from embed URLs.
 */

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Token cache (separate from routes/artists.js to avoid breakage)
let accessToken = null;
let expiresAt = 0;

export async function getSpotifyToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return null;
  }

  if (accessToken && Date.now() < expiresAt) {
    return accessToken;
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString(
          'base64'
        ),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status}`);
  }

  const data = await res.json();
  accessToken = data.access_token;
  // Expire 60s early to avoid edge-case failures
  expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

/**
 * Parse a Spotify URL to extract type and ID.
 * Supports track and album URLs.
 * @param {string} url - Spotify URL
 * @returns {{ type: string, id: string } | null}
 */
export function parseSpotifyUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /open\.spotify\.com\/(track|album)\/([a-zA-Z0-9]+)/
  );
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

/**
 * Fetch artist names and Spotify IDs for a given Spotify track or album URL.
 * Returns empty array on any failure (non-fatal).
 * @param {string} url - Spotify URL
 * @returns {Promise<Array<{ name: string, spotifyId: string }>>}
 */
export async function getArtistsForSpotifyUrl(url) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return [];
  }

  const parsed = parseSpotifyUrl(url);
  if (!parsed) return [];

  try {
    const token = await getSpotifyToken();
    if (!token) return [];

    const apiUrl = `https://api.spotify.com/v1/${parsed.type}s/${parsed.id}`;
    const resp = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return [];

    const data = await resp.json();
    const artists = data.artists || [];

    return artists.map((a) => ({
      name: a.name,
      spotifyId: a.id,
    }));
  } catch {
    return [];
  }
}
