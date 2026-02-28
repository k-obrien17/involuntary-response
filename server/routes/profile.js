import { createHash } from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import db from '../db/index.js';

const emailHash = (email) => createHash('md5').update(email.trim().toLowerCase()).digest('hex');

const router = Router();

const bioLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many profile updates, try again later' },
});

// GET /:username/profile — Public profile page data
router.get('/:username/profile', async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, display_name, username, bio, email, created_at FROM users WHERE username = ? AND is_active = 1',
      req.params.username
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch all posts by this user (no pagination — contributors write tens, not thousands)
    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.created_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.author_id = ?
       ORDER BY p.created_at DESC`,
      user.id
    );

    // Batch-load embeds, tags, and artists
    const postIds = rows.map((p) => p.id);
    const embedMap = {};
    const tagMap = {};
    const artistMap = {};

    if (postIds.length > 0) {
      const ph = postIds.map(() => '?').join(',');

      const embeds = await db.all(
        `SELECT post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html
         FROM post_embeds WHERE post_id IN (${ph})`,
        ...postIds
      );
      for (const e of embeds) {
        embedMap[e.post_id] = {
          provider: e.provider,
          embedType: e.embed_type,
          embedUrl: e.embed_url,
          originalUrl: e.original_url,
          title: e.title,
          thumbnailUrl: e.thumbnail_url,
          embedHtml: e.embed_html,
        };
      }

      const tags = await db.all(
        `SELECT post_id, tag FROM post_tags WHERE post_id IN (${ph}) ORDER BY tag`,
        ...postIds
      );
      for (const t of tags) {
        (tagMap[t.post_id] ||= []).push(t.tag);
      }

      const artistRows = await db.all(
        `SELECT post_id, artist_name, spotify_id FROM post_artists WHERE post_id IN (${ph})`,
        ...postIds
      );
      for (const a of artistRows) {
        (artistMap[a.post_id] ||= []).push({
          name: a.artist_name,
          spotifyId: a.spotify_id,
        });
      }
    }

    const posts = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      body: p.body,
      createdAt: p.created_at,
      author: {
        displayName: p.author_display_name,
        username: p.author_username,
        emailHash: emailHash(p.author_email),
      },
      embed: embedMap[p.id] || null,
      tags: tagMap[p.id] || [],
      artists: artistMap[p.id] || [],
    }));

    res.json({
      user: {
        displayName: user.display_name,
        username: user.username,
        bio: user.bio || null,
        createdAt: user.created_at,
        emailHash: emailHash(user.email),
      },
      posts,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /me — Update own bio (requires auth)
router.put('/me', authenticateToken, bioLimiter, async (req, res) => {
  try {
    let bio = req.body.bio;

    if (bio == null) {
      bio = null;
    } else {
      bio = String(bio).trim().replace(/<[^>]*>/g, '').slice(0, 300);
      if (bio.length === 0) bio = null;
    }

    await db.run('UPDATE users SET bio = ? WHERE id = ?', bio, req.user.id);

    res.json({ bio });
  } catch (err) {
    console.error('Update bio error:', err);
    res.status(500).json({ error: 'Failed to update bio' });
  }
});

export default router;
