import { Router } from 'express';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import db from '../db/index.js';
import { resolveEmbed } from '../lib/oembed.js';

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
      const resolved = await resolveEmbed(embedUrl);
      if (resolved) {
        await db.run(
          'INSERT INTO post_embeds (post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          postId, resolved.provider, resolved.embedType, resolved.embedUrl, resolved.originalUrl,
          resolved.title || null, resolved.thumbnailUrl || null, resolved.embedHtml || null
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
      'SELECT provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html FROM post_embeds WHERE post_id = ?',
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
            embedHtml: embed.embed_html,
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
      const resolved = await resolveEmbed(embedUrl);
      if (resolved) {
        await db.run(
          'INSERT INTO post_embeds (post_id, provider, embed_type, embed_url, original_url, title, thumbnail_url, embed_html) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          post.id, resolved.provider, resolved.embedType, resolved.embedUrl, resolved.originalUrl,
          resolved.title || null, resolved.thumbnailUrl || null, resolved.embedHtml || null
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
