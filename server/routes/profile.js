import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireContributor } from '../middleware/auth.js';
import db from '../db/index.js';
import { batchLoadPostData, formatPosts, emailHash } from '../lib/post-helpers.js';

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

    // Fetch published posts by this user (no pagination — contributors write tens, not thousands)
    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.created_at, p.updated_at, p.published_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.author_id = ? AND p.status = 'published'
       ORDER BY p.published_at DESC`,
      user.id
    );

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap } = await batchLoadPostData(postIds);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap);

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
router.put('/me', authenticateToken, requireContributor, bioLimiter, async (req, res) => {
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
