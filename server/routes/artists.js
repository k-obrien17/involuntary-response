import { Router } from 'express';

const router = Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Token cache for client credentials flow
let accessToken = null;
let expiresAt = 0;

async function getSpotifyToken() {
  if (accessToken && Date.now() < expiresAt) {
    return accessToken;
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
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

router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.json({ artists: [] });
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    // Return mock data if no credentials configured
    return res.json({
      artists: [
        { name: q, image: null, popularity: 50, spotifyId: null, spotifyUrl: null },
      ]
    });
  }

  try {
    const token = await getSpotifyToken();

    const url = new URL('https://api.spotify.com/v1/search');
    url.searchParams.set('type', 'artist');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '10');

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error('Spotify API error:', response.status);
      return res.status(500).json({ error: 'Search failed' });
    }

    const data = await response.json();

    const artists = (data.artists?.items || []).map(artist => ({
      name: artist.name,
      spotifyId: artist.id,
      image: artist.images[0]?.url || null,
      popularity: artist.popularity,
      spotifyUrl: artist.external_urls?.spotify || null,
      genres: artist.genres || [],
    }));

    res.json({ artists });
  } catch (err) {
    console.error('Artist search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
