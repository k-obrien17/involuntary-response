import { Router } from 'express';
import db from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { batchLoadPostData, formatPosts, parseCursor } from '../lib/post-helpers.js';

const router = Router();

// GET / — Full-text search across posts, artists, tags, and contributors
router.get('/', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);
    const term = `%${q}%`;

    const rows = await db.all(
      `SELECT DISTINCT p.id, p.slug, p.body, p.created_at, p.updated_at, p.published_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN post_artists pa ON pa.post_id = p.id
       LEFT JOIN post_tags pt ON pt.post_id = p.id
       WHERE (
         p.body LIKE ? COLLATE NOCASE
         OR pa.artist_name LIKE ? COLLATE NOCASE
         OR pt.tag LIKE ? COLLATE NOCASE
         OR u.display_name LIKE ? COLLATE NOCASE
         OR u.username LIKE ? COLLATE NOCASE
       )
       AND p.status = 'published'
       ${cursorClause}
       ORDER BY p.published_at DESC, p.id DESC
       LIMIT ?`,
      term, term, term, term, term, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap } = await batchLoadPostData(postIds, req.user?.id);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.published_at}|${lastPost.id}` : null;

    res.json({ query: q, posts, nextCursor });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search' });
  }
});

export default router;
