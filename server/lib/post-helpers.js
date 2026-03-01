import { createHash } from 'crypto';
import db from '../db/index.js';

/**
 * MD5 hash of trimmed, lowercased email for Gravatar-compatible avatars.
 */
export function emailHash(email) {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex');
}

/**
 * Batch-load embeds, tags, artists, and like data for a set of post IDs.
 * Returns { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap } keyed by post_id.
 */
export async function batchLoadPostData(postIds, userId = null) {
  const embedMap = {};
  const tagMap = {};
  const artistMap = {};
  const likeCountMap = {};
  const likedByUserMap = {};
  const commentCountMap = {};

  if (postIds.length === 0) return { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap };

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

  const likeCounts = await db.all(
    `SELECT post_id, COUNT(*) as count FROM post_likes WHERE post_id IN (${ph}) GROUP BY post_id`,
    ...postIds
  );
  for (const row of likeCounts) {
    likeCountMap[row.post_id] = row.count;
  }

  if (userId && postIds.length > 0) {
    const userLikes = await db.all(
      `SELECT post_id FROM post_likes WHERE post_id IN (${ph}) AND user_id = ?`,
      ...postIds, userId
    );
    for (const row of userLikes) {
      likedByUserMap[row.post_id] = true;
    }
  }

  const commentCounts = await db.all(
    `SELECT post_id, COUNT(*) as count FROM post_comments WHERE post_id IN (${ph}) GROUP BY post_id`,
    ...postIds
  );
  for (const row of commentCounts) {
    commentCountMap[row.post_id] = row.count;
  }

  return { embedMap, tagMap, artistMap, likeCountMap, likedByUserMap, commentCountMap };
}

/**
 * Format post rows into the standard response shape.
 * Includes publishedAt, updatedAt, likeCount, and likedByUser fields.
 */
export function formatPosts(rows, embedMap, tagMap, artistMap, likeCountMap = {}, likedByUserMap = {}, commentCountMap = {}) {
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    body: p.body,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    publishedAt: p.published_at,
    author: {
      displayName: p.author_display_name,
      username: p.author_username,
      emailHash: emailHash(p.author_email),
    },
    embed: embedMap[p.id] || null,
    tags: tagMap[p.id] || [],
    artists: artistMap[p.id] || [],
    likeCount: likeCountMap[p.id] || 0,
    likedByUser: !!likedByUserMap[p.id],
    commentCount: commentCountMap[p.id] || 0,
  }));
}

/**
 * Parse cursor string and produce a WHERE clause fragment.
 * Uses published_at for feed ordering (supports drafts published later).
 * Returns { cursorClause, cursorParams }.
 */
export function parseCursor(cursor) {
  if (!cursor) return { cursorClause: '', cursorParams: [] };
  const [cursorDate, cursorId] = cursor.split('|');
  return {
    cursorClause: 'AND (p.published_at < ? OR (p.published_at = ? AND p.id < ?))',
    cursorParams: [cursorDate, cursorDate, parseInt(cursorId)],
  };
}
