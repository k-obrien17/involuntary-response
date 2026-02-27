import { Router } from 'express';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import db from '../db/index.js';

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

function parseEmbedUrl(url) {
  if (!url) return null;

  // Spotify: track, album, or playlist
  const spotifyMatch = url.match(
    /https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/
  );
  if (spotifyMatch) {
    const [, type, id] = spotifyMatch;
    return {
      provider: 'spotify',
      type,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
      originalUrl: url,
    };
  }

  // Apple Music: album, playlist, or song
  const appleMatch = url.match(
    /https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|playlist|song)\/[^/]+\/([0-9]+)(\?i=([0-9]+))?/
  );
  if (appleMatch) {
    const [, region, type, collectionId, , songId] = appleMatch;
    const finalType = songId ? 'song' : type;
    let embedUrl = `https://embed.music.apple.com/${region}/${type}/x/${collectionId}`;
    if (songId) {
      embedUrl += `?i=${songId}`;
    }
    return {
      provider: 'apple-music',
      type: finalType,
      id: songId || collectionId,
      embedUrl,
      originalUrl: url,
    };
  }

  return null;
}

async function fetchSpotifyMetadata(spotifyUrl) {
  try {
    const response = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return { title: data.title || null, thumbnailUrl: data.thumbnail_url || null };
  } catch {
    return null;
  }
}

function validateEmbedDomain(embedUrl) {
  return (
    embedUrl.startsWith('https://open.spotify.com/embed/') ||
    embedUrl.startsWith('https://embed.music.apple.com/')
  );
}

// --- Routes ---

// POST / — Create post
router.post('/', authenticateToken, createLimiter, async (req, res) => {
  try {
    const { embedUrl, tags } = req.body;
    const body = sanitize(req.body.body, 1200);

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
    if (embedUrl) {
      const parsed = parseEmbedUrl(embedUrl);
      if (parsed && validateEmbedDomain(parsed.embedUrl)) {
        let metadata = {};
        if (parsed.provider === 'spotify') {
          metadata = (await fetchSpotifyMetadata(parsed.originalUrl)) || {};
        }
        await db.run(
          'INSERT INTO post_embeds (post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
          postId, parsed.provider, parsed.type, parsed.embedUrl, parsed.originalUrl,
          metadata.title || null, metadata.thumbnailUrl || null
        );
      }
    }

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
router.get('/:slug', async (req, res) => {
  try {
    const post = await db.get(
      `SELECT p.id, p.slug, p.body, p.author_id, p.created_at, p.updated_at,
              u.display_name as author_display_name, u.username as author_username
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.slug = ?`,
      req.params.slug
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Fetch embed
    const embed = await db.get(
      'SELECT provider, embed_type, embed_url, original_url, title, thumbnail_url FROM post_embeds WHERE post_id = ?',
      post.id
    );

    // Fetch tags
    const tagRows = await db.all(
      'SELECT tag FROM post_tags WHERE post_id = ? ORDER BY tag',
      post.id
    );

    res.json({
      id: post.id,
      slug: post.slug,
      body: post.body,
      authorId: post.author_id,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: {
        displayName: post.author_display_name,
        username: post.author_username,
      },
      embed: embed
        ? {
            provider: embed.provider,
            embedType: embed.embed_type,
            embedUrl: embed.embed_url,
            originalUrl: embed.original_url,
            title: embed.title,
            thumbnailUrl: embed.thumbnail_url,
          }
        : null,
      tags: tagRows.map((r) => r.tag),
    });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

// PUT /:slug — Update post
router.put('/:slug', authenticateToken, updateLimiter, async (req, res) => {
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

    if (!body) {
      return res.status(400).json({ error: 'Post body is required' });
    }

    await db.run(
      'UPDATE posts SET body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      body, post.id
    );

    // Replace embed
    await db.run('DELETE FROM post_embeds WHERE post_id = ?', post.id);
    if (embedUrl) {
      const parsed = parseEmbedUrl(embedUrl);
      if (parsed && validateEmbedDomain(parsed.embedUrl)) {
        let metadata = {};
        if (parsed.provider === 'spotify') {
          metadata = (await fetchSpotifyMetadata(parsed.originalUrl)) || {};
        }
        await db.run(
          'INSERT INTO post_embeds (post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
          post.id, parsed.provider, parsed.type, parsed.embedUrl, parsed.originalUrl,
          metadata.title || null, metadata.thumbnailUrl || null
        );
      }
    }

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
router.delete('/:slug', authenticateToken, async (req, res) => {
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
