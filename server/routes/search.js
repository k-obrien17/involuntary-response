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
 */
function parseCursor(cursor) {
  if (!cursor) return { cursorClause: '', cursorParams: [] };
  const [cursorDate, cursorId] = cursor.split('|');
  return {
    cursorClause: 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))',
    cursorParams: [cursorDate, cursorDate, parseInt(cursorId)],
  };
}

// GET / — Full-text search across posts, artists, tags, and contributors
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);
    const term = `%${q}%`;

    const rows = await db.all(
      `SELECT DISTINCT p.id, p.slug, p.body, p.created_at,
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
       ${cursorClause}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
      term, term, term, term, term, ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap } = await batchLoadPostData(postIds);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.created_at}|${lastPost.id}` : null;

    res.json({ query: q, posts, nextCursor });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search' });
  }
});

export default router;
