import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import { resolveEmbed, SUPPORTED_PROVIDERS } from '../lib/oembed.js';
import { getArtistsForSpotifyUrl } from '../lib/spotify.js';
import { getArtistsForAppleMusicUrl } from '../lib/apple-music.js';

const router = Router();

const resolveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many resolve requests, try again later' },
});

// POST /resolve — resolve a URL to embed data for live preview
router.post('/resolve', authenticateToken, resolveLimiter, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await resolveEmbed(url.trim());
    if (!result) {
      return res.status(422).json({
        error: `Unsupported or invalid URL. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
      });
    }

    // Extract artists for preview (non-fatal — empty array on failure)
    let artists = [];
    try {
      if (result.provider === 'spotify') {
        artists = await getArtistsForSpotifyUrl(url.trim());
      } else if (result.provider === 'apple') {
        artists = await getArtistsForAppleMusicUrl(url.trim());
      }
    } catch (err) {
      console.error('Artist preview extraction error (non-fatal):', err);
    }

    res.json({ ...result, artists });
  } catch (err) {
    console.error('Embed resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve embed' });
  }
});

export default router;
