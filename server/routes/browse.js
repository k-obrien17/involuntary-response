import { createHash } from 'crypto';
import { Router } from 'express';
import db from '../db/index.js';

const emailHash = (email) => createHash('md5').update(email.trim().toLowerCase()).digest('hex');

const router = Router();

/**
 * Helper: batch-load embeds, tags, and artists for a set of post IDs.
 * Returns { embedMap, tagMap, artistMap } keyed by post_id.
 */
async function batchLoadPostData(postIds) {
  const embedMap = {};
  const tagMap = {};
  const artistMap = {};

  if (postIds.length === 0) return { embedMap, tagMap, artistMap };

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

  return { embedMap, tagMap, artistMap };
}

/**
 * Helper: format post rows into the standard response shape.
 */
function formatPosts(rows, embedMap, tagMap, artistMap) {
  return rows.map((p) => ({
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
}

/**
 * Helper: parse cursor and apply cursor-based WHERE clause.
 * Returns { whereClause, whereParams } to append to queries.
 */
function parseCursor(cursor) {
  if (!cursor) return { cursorClause: '', cursorParams: [] };
  const [cursorDate, cursorId] = cursor.split('|');
  return {
    cursorClause: 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))',
    cursorParams: [cursorDate, cursorDate, parseInt(cursorId)],
  };
}

// GET /tag/:tag — Posts filtered by tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);

    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.created_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       JOIN post_tags pt ON pt.post_id = p.id
       WHERE pt.tag = ? ${cursorClause}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      tag, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap } = await batchLoadPostData(postIds);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.created_at}|${lastPost.id}` : null;

    res.json({ tag, posts, nextCursor });
  } catch (err) {
    console.error('Browse tag error:', err);
    res.status(500).json({ error: 'Failed to browse by tag' });
  }
});

// GET /artist/:name — Posts featuring an artist
router.get('/artist/:name', async (req, res) => {
  try {
    const artistName = decodeURIComponent(req.params.name);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);

    // Get artist header image from most recent post
    const artistInfo = await db.get(
      `SELECT artist_image FROM post_artists
       WHERE artist_name = ? COLLATE NOCASE AND artist_image IS NOT NULL
       ORDER BY post_id DESC LIMIT 1`,
      artistName
    );

    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.created_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       JOIN post_artists pa ON pa.post_id = p.id
       WHERE pa.artist_name = ? COLLATE NOCASE ${cursorClause}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      artistName, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap } = await batchLoadPostData(postIds);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.created_at}|${lastPost.id}` : null;

    res.json({
      artist: { name: artistName, image: artistInfo?.artist_image || null },
      posts,
      nextCursor,
    });
  } catch (err) {
    console.error('Browse artist error:', err);
    res.status(500).json({ error: 'Failed to browse by artist' });
  }
});

// GET /contributor/:username — Posts by a contributor
router.get('/contributor/:username', async (req, res) => {
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
      `SELECT p.id, p.slug, p.body, p.created_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.author_id = ? ${cursorClause}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      user.id, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap } = await batchLoadPostData(postIds);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.created_at}|${lastPost.id}` : null;

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

// GET /explore — Discovery hub (popular tags, top artists, active contributors)
router.get('/explore', async (req, res) => {
  try {
    const tags = await db.all(
      `SELECT pt.tag, MAX(p.created_at) as latest
       FROM post_tags pt
       JOIN posts p ON pt.post_id = p.id
       GROUP BY pt.tag
       ORDER BY latest DESC
       LIMIT 10`
    );

    const artists = await db.all(
      `SELECT pa.artist_name, pa.artist_image, MAX(p.created_at) as latest
       FROM post_artists pa
       JOIN posts p ON pa.post_id = p.id
       GROUP BY pa.artist_name COLLATE NOCASE
       ORDER BY latest DESC
       LIMIT 10`
    );

    const contributors = await db.all(
      `SELECT u.username, u.display_name, u.email, MAX(p.created_at) as latest
       FROM users u
       JOIN posts p ON u.id = p.author_id
       WHERE u.is_active = 1
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

export default router;
