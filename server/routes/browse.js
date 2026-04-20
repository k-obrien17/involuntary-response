import { Router } from 'express';
import db from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { batchLoadPostData, formatPosts, parseCursor, emailHash } from '../lib/post-helpers.js';

const router = Router();

// GET /tag/:tag — Posts filtered by tag
router.get('/tag/:tag', optionalAuth, async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);

    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.format, p.created_at, p.updated_at, p.published_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       JOIN post_tags pt ON pt.post_id = p.id
       WHERE pt.tag = ? AND p.status = 'published' ${cursorClause}
       ORDER BY p.published_at DESC, p.id DESC
       LIMIT ?`,
      tag, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap } = await batchLoadPostData(postIds, req.user?.id);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.published_at}|${lastPost.id}` : null;

    res.json({ tag, posts, nextCursor });
  } catch (err) {
    console.error('Browse tag error:', err);
    res.status(500).json({ error: 'Failed to browse by tag' });
  }
});

// GET /artist/:name — Posts featuring an artist
router.get('/artist/:name', optionalAuth, async (req, res) => {
  try {
    const artistName = decodeURIComponent(req.params.name);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);

    const artistInfo = await db.get(
      `SELECT artist_image, spotify_id FROM post_artists
       WHERE artist_name = ? COLLATE NOCASE AND artist_image IS NOT NULL
       ORDER BY post_id DESC LIMIT 1`,
      artistName
    );

    const postCount = await db.get(
      `SELECT COUNT(DISTINCT p.id) as count FROM posts p
       JOIN post_artists pa ON pa.post_id = p.id
       WHERE pa.artist_name = ? COLLATE NOCASE AND p.status = 'published'`,
      artistName
    );

    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.format, p.created_at, p.updated_at, p.published_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       JOIN post_artists pa ON pa.post_id = p.id
       WHERE pa.artist_name = ? COLLATE NOCASE AND p.status = 'published' ${cursorClause}
       ORDER BY p.published_at DESC, p.id DESC
       LIMIT ?`,
      artistName, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap } = await batchLoadPostData(postIds, req.user?.id);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.published_at}|${lastPost.id}` : null;

    const spotifyId = artistInfo?.spotify_id;
    res.json({
      artist: {
        name: artistName,
        image: artistInfo?.artist_image || null,
        postCount: postCount?.count || 0,
        spotifyUrl: spotifyId ? `https://open.spotify.com/artist/${spotifyId}` : null,
      },
      posts,
      nextCursor,
    });
  } catch (err) {
    console.error('Browse artist error:', err);
    res.status(500).json({ error: 'Failed to browse by artist' });
  }
});

// GET /contributor/:username — Posts by a contributor
router.get('/contributor/:username', optionalAuth, async (req, res) => {
  try {
    const username = req.params.username;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);

    const user = await db.get(
      'SELECT id, display_name, username FROM users WHERE username = ? AND is_active = 1',
      username
    );

    if (!user) {
      return res.status(404).json({ error: 'Contributor not found' });
    }

    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.format, p.created_at, p.updated_at, p.published_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.author_id = ? AND p.status = 'published' ${cursorClause}
       ORDER BY p.published_at DESC, p.id DESC
       LIMIT ?`,
      user.id, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap } = await batchLoadPostData(postIds, req.user?.id);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.published_at}|${lastPost.id}` : null;

    res.json({
      contributor: {
        displayName: user.display_name,
        username: user.username,
      },
      posts,
      nextCursor,
    });
  } catch (err) {
    console.error('Browse contributor error:', err);
    res.status(500).json({ error: 'Failed to browse by contributor' });
  }
});

// GET /category/:slug — Posts filtered by category
router.get('/category/:slug', optionalAuth, async (req, res) => {
  try {
    const category = await db.get(
      'SELECT id, name, slug, icon FROM categories WHERE slug = ?',
      req.params.slug
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);

    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.format, p.created_at, p.updated_at, p.published_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email,
              c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
       FROM posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.category_id = ? AND p.status = 'published' ${cursorClause}
       ORDER BY p.published_at DESC, p.id DESC
       LIMIT ?`,
      category.id, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap } = await batchLoadPostData(postIds, req.user?.id);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.published_at}|${lastPost.id}` : null;

    res.json({ category, posts, nextCursor });
  } catch (err) {
    console.error('Browse category error:', err);
    res.status(500).json({ error: 'Failed to browse by category' });
  }
});

// GET /explore — Discovery hub (popular tags, top artists, active contributors)
router.get('/explore', async (req, res) => {
  try {
    const tags = await db.all(
      `SELECT pt.tag, MAX(p.created_at) as latest
       FROM post_tags pt
       JOIN posts p ON pt.post_id = p.id
       WHERE p.status = 'published'
       GROUP BY pt.tag
       ORDER BY latest DESC
       LIMIT 10`
    );

    const artists = await db.all(
      `SELECT pa.artist_name, pa.artist_image, MAX(p.created_at) as latest
       FROM post_artists pa
       JOIN posts p ON pa.post_id = p.id
       WHERE p.status = 'published'
       GROUP BY pa.artist_name COLLATE NOCASE
       ORDER BY latest DESC
       LIMIT 10`
    );

    const contributors = await db.all(
      `SELECT u.username, u.display_name, u.email, MAX(p.created_at) as latest
       FROM users u
       JOIN posts p ON u.id = p.author_id
       WHERE u.is_active = 1 AND p.status = 'published'
       GROUP BY u.id
       ORDER BY latest DESC
       LIMIT 10`
    );

    res.json({
      tags: tags.map((t) => ({ tag: t.tag, latestPostAt: t.latest })),
      artists: artists.map((a) => ({
        name: a.artist_name,
        image: a.artist_image,
        latestPostAt: a.latest,
      })),
      contributors: contributors.map((c) => ({
        username: c.username,
        displayName: c.display_name,
        emailHash: emailHash(c.email),
        latestPostAt: c.latest,
      })),
    });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ error: 'Failed to load explore data' });
  }
});

// GET /tags — All tags (for autocomplete)
router.get('/tags', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT pt.tag, COUNT(*) as count
       FROM post_tags pt
       JOIN posts p ON pt.post_id = p.id
       WHERE p.status = 'published'
       GROUP BY pt.tag
       ORDER BY count DESC`
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ tags: rows.map((r) => r.tag) });
  } catch (err) {
    console.error('Tags list error:', err);
    res.status(500).json({ error: 'Failed to load tags' });
  }
});

export default router;
