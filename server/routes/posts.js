import { Router } from 'express';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import { authenticateToken, optionalAuth, requireContributor } from '../middleware/auth.js';
import db from '../db/index.js';
import { resolveEmbed } from '../lib/oembed.js';
import { getArtistsForSpotifyUrl } from '../lib/spotify.js';
import { getArtistsForAppleMusicUrl } from '../lib/apple-music.js';
import { batchLoadPostData, formatPosts, parseCursor, emailHash } from '../lib/post-helpers.js';

const router = Router();

// Rate limiters
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many posts created, try again later' },
});

const updateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: { error: 'Too many edits, try again later' },
});

const deleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many deletions, try again later' },
});

// --- Helper functions ---

function sanitize(str, maxLength) {
  if (str == null) return null;
  return String(str).trim().replace(/<[^>]*>/g, '').slice(0, maxLength);
}

async function insertTags(postId, tags) {
  const cleaned = tags.slice(0, 5);
  const seen = new Set();
  for (const raw of cleaned) {
    const tag = String(raw)
      .toLowerCase()
      .replace(/[^a-z0-9\- ]/g, '')
      .trim()
      .slice(0, 30);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    await db.run('INSERT OR IGNORE INTO post_tags (post_id, tag) VALUES (?, ?)', postId, tag);
  }
}

async function insertArtists(postId, artists, source, image) {
  for (const artist of artists) {
    await db.run(
      'INSERT OR IGNORE INTO post_artists (post_id, artist_name, artist_image, spotify_id, source) VALUES (?, ?, ?, ?, ?)',
      postId, artist.name, image || null, artist.spotifyId || null, source
    );
  }
}

/**
 * Extract artists from an embed URL (Spotify or Apple Music) and insert into post_artists.
 * Falls back to manual artistName if no auto-extraction occurs.
 * Returns the number of artists inserted (for logging/debugging).
 */
async function extractAndInsertArtists(postId, embedUrl, resolved, artistName) {
  let inserted = 0;

  // Try Spotify extraction
  if (embedUrl) {
    try {
      const spotifyArtists = await getArtistsForSpotifyUrl(embedUrl);
      if (spotifyArtists.length > 0) {
        await insertArtists(postId, spotifyArtists, 'spotify', resolved?.thumbnailUrl);
        inserted = spotifyArtists.length;
      }
    } catch (err) {
      console.error('Spotify artist extraction error (non-fatal):', err);
    }
  }

  // Try Apple Music extraction (only if Spotify found nothing)
  if (inserted === 0 && embedUrl) {
    try {
      const appleArtists = await getArtistsForAppleMusicUrl(embedUrl);
      if (appleArtists.length > 0) {
        await insertArtists(postId, appleArtists, 'apple', null);
        inserted = appleArtists.length;
      }
    } catch (err) {
      console.error('Apple Music artist extraction error (non-fatal):', err);
    }
  }

  // Manual artistName fallback (only if no auto-extraction occurred)
  if (inserted === 0 && artistName) {
    try {
      await insertArtists(postId, [{ name: artistName }], 'manual', null);
      inserted = 1;
    } catch (err) {
      console.error('Manual artist insertion error (non-fatal):', err);
    }
  }

  return inserted;
}

// --- Routes ---

// GET / — List posts (reverse chronological, cursor-paginated)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const { cursorClause, cursorParams } = parseCursor(req.query.cursor);

    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.author_id, p.created_at, p.updated_at, p.published_at,
              u.display_name AS author_display_name, u.username AS author_username, u.email AS author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.status = 'published' ${cursorClause}
       ORDER BY p.published_at DESC, p.id DESC
       LIMIT ?`,
      ...cursorParams, limit + 1
    );

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const postIds = rows.map((p) => p.id);
    const { embedMap, tagMap, artistMap } = await batchLoadPostData(postIds);
    const posts = formatPosts(rows, embedMap, tagMap, artistMap);

    const lastPost = rows[rows.length - 1];
    const nextCursor =
      hasMore && lastPost ? `${lastPost.published_at}|${lastPost.id}` : null;

    res.json({ posts, nextCursor });
  } catch (err) {
    console.error('List posts error:', err);
    res.status(500).json({ error: 'Failed to load posts' });
  }
});

// POST / — Create post
router.post('/', authenticateToken, requireContributor, createLimiter, async (req, res) => {
  try {
    const { embedUrl, tags } = req.body;
    const body = sanitize(req.body.body, 1200);
    const artistName = sanitize(req.body.artistName, 200);

    if (!body) {
      return res.status(400).json({ error: 'Post body is required' });
    }

    const slug = nanoid();

    const result = await db.run(
      'INSERT INTO posts (slug, body, author_id) VALUES (?, ?, ?)',
      slug, body, req.user.id
    );
    const postId = result.lastInsertRowid;

    // Handle embed
    let resolved = null;
    if (embedUrl) {
      resolved = await resolveEmbed(embedUrl);
      if (resolved) {
        await db.run(
          'INSERT INTO post_embeds (post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          postId, resolved.provider, resolved.embedType, resolved.embedUrl, resolved.originalUrl,
          resolved.title || null, resolved.thumbnailUrl || null, resolved.embedHtml || null
        );
      }
    }

    // Extract and store artist data (Spotify, Apple Music, or manual — non-fatal)
    await extractAndInsertArtists(postId, embedUrl, resolved, artistName);

    // Handle tags
    if (tags && Array.isArray(tags)) {
      await insertTags(postId, tags);
    }

    res.status(201).json({ id: postId, slug });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /:slug — Read single post
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const post = await db.get(
      `SELECT p.id, p.slug, p.body, p.author_id, p.status, p.created_at, p.updated_at, p.published_at,
              u.display_name as author_display_name, u.username as author_username, u.email as author_email
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.slug = ?`,
      req.params.slug
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Non-published posts visible only to their author
    if (post.status !== 'published' && (!req.user || req.user.id !== post.author_id)) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Fetch embed
    const embed = await db.get(
      'SELECT provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html FROM post_embeds WHERE post_id = ?',
      post.id
    );

    // Fetch tags
    const tagRows = await db.all(
      'SELECT tag FROM post_tags WHERE post_id = ? ORDER BY tag',
      post.id
    );

    // Fetch artists
    const artistRows = await db.all(
      'SELECT artist_name, spotify_id FROM post_artists WHERE post_id = ?',
      post.id
    );

    res.json({
      id: post.id,
      slug: post.slug,
      body: post.body,
      authorId: post.author_id,
      status: post.status,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at,
      author: {
        displayName: post.author_display_name,
        username: post.author_username,
        emailHash: emailHash(post.author_email),
      },
      embed: embed
        ? {
            provider: embed.provider,
            embedType: embed.embed_type,
            embedUrl: embed.embed_url,
            originalUrl: embed.original_url,
            title: embed.title,
            thumbnailUrl: embed.thumbnail_url,
            embedHtml: embed.embed_html,
          }
        : null,
      tags: tagRows.map((r) => r.tag),
      artists: artistRows.map((a) => ({ name: a.artist_name, spotifyId: a.spotify_id })),
    });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

// PUT /:slug — Update post
router.put('/:slug', authenticateToken, requireContributor, updateLimiter, async (req, res) => {
  try {
    const post = await db.get('SELECT id, author_id FROM posts WHERE slug = ?', req.params.slug);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    const { embedUrl, tags } = req.body;
    const body = sanitize(req.body.body, 1200);
    const artistName = sanitize(req.body.artistName, 200);

    if (!body) {
      return res.status(400).json({ error: 'Post body is required' });
    }

    await db.run(
      'UPDATE posts SET body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      body, post.id
    );

    // Replace embed
    await db.run('DELETE FROM post_embeds WHERE post_id = ?', post.id);
    let resolvedEmbed = null;
    if (embedUrl) {
      resolvedEmbed = await resolveEmbed(embedUrl);
      if (resolvedEmbed) {
        await db.run(
          'INSERT INTO post_embeds (post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          post.id, resolvedEmbed.provider, resolvedEmbed.embedType, resolvedEmbed.embedUrl, resolvedEmbed.originalUrl,
          resolvedEmbed.title || null, resolvedEmbed.thumbnailUrl || null, resolvedEmbed.embedHtml || null
        );
      }
    }

    // Replace artist data (Spotify, Apple Music, or manual — non-fatal)
    await db.run('DELETE FROM post_artists WHERE post_id = ?', post.id);
    await extractAndInsertArtists(post.id, embedUrl, resolvedEmbed, artistName);

    // Replace tags
    await db.run('DELETE FROM post_tags WHERE post_id = ?', post.id);
    if (tags && Array.isArray(tags)) {
      await insertTags(post.id, tags);
    }

    res.json({ id: post.id, slug: req.params.slug });
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /:slug — Delete post
router.delete('/:slug', authenticateToken, requireContributor, deleteLimiter, async (req, res) => {
  try {
    const post = await db.get('SELECT id, author_id FROM posts WHERE slug = ?', req.params.slug);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await db.run('DELETE FROM posts WHERE id = ?', post.id);

    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
