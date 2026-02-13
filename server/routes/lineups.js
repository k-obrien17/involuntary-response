import { Router } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: 'Too many lineups created, try again later' } });
const commentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many comments, try again later' } });
const likeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Too many likes, try again later' } });

// Sanitize user input: trim, strip HTML tags, enforce max length
function sanitize(str, maxLength) {
  if (str == null) return null;
  return String(str).trim().replace(/<[^>]*>/g, '').slice(0, maxLength);
}

// Get all lineups for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const lineups = db.prepare(`
      SELECT l.*,
        (SELECT json_group_array(json_object(
          'artist_name', la.artist_name,
          'artist_image', la.artist_image,
          'artist_spotify_id', la.artist_spotify_id,
          'artist_spotify_url', la.artist_spotify_url,
          'slot_position', la.slot_position,
          'note', la.note
        ))
        FROM lineup_artists la
        WHERE la.lineup_id = l.id
        ORDER BY la.slot_position) as artists,
        (SELECT json_group_array(lt.tag)
        FROM lineup_tags lt
        WHERE lt.lineup_id = l.id) as tags
      FROM lineups l
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(req.user.id);

    const parsed = lineups.map(l => ({
      ...l,
      artists: JSON.parse(l.artists || '[]'),
      tags: JSON.parse(l.tags || '[]').filter(t => t !== null)
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Get lineups error:', err);
    res.status(500).json({ error: 'Failed to get lineups' });
  }
});

// Get single lineup (public or own)
router.get('/:id', (req, res) => {
  try {
    const lineup = db.prepare(`
      SELECT l.*, u.username as creator_username
      FROM lineups l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lineup) {
      return res.status(404).json({ error: 'Lineup not found' });
    }

    // Check if public or owned by requester
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch {}
    }

    if (!lineup.is_public && lineup.user_id !== userId) {
      return res.status(403).json({ error: 'This lineup is private' });
    }

    const artists = db.prepare(`
      SELECT artist_name, artist_image, artist_mbid, artist_spotify_id, artist_spotify_url, slot_position, note
      FROM lineup_artists
      WHERE lineup_id = ?
      ORDER BY slot_position
    `).all(req.params.id);

    const tags = db.prepare('SELECT tag FROM lineup_tags WHERE lineup_id = ?').all(req.params.id).map(r => r.tag);

    res.json({ ...lineup, artists, tags });
  } catch (err) {
    console.error('Get lineup error:', err);
    res.status(500).json({ error: 'Failed to get lineup' });
  }
});

// Sanitize and insert tags for a lineup
function insertTags(lineupId, tags) {
  if (!Array.isArray(tags)) return;
  const insertTag = db.prepare('INSERT OR IGNORE INTO lineup_tags (lineup_id, tag) VALUES (?, ?)');
  const seen = new Set();
  for (const raw of tags.slice(0, 5)) {
    const tag = String(raw).toLowerCase().replace(/[^a-z0-9\- ]/g, '').trim().slice(0, 30);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      insertTag.run(lineupId, tag);
    }
  }
}

// Create lineup
router.post('/', authenticateToken, createLimiter, (req, res) => {
  const { is_public, artists, tags } = req.body;
  const title = sanitize(req.body.title, 100);
  const description = sanitize(req.body.description, 500);

  if (!title || !artists || artists.length === 0) {
    return res.status(400).json({ error: 'Title and at least one artist required' });
  }

  if (artists.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 artists allowed' });
  }

  try {
    const insertLineup = db.prepare('INSERT INTO lineups (user_id, title, description, is_public) VALUES (?, ?, ?, ?)');
    const result = insertLineup.run(req.user.id, title, description || null, is_public ? 1 : 0);
    const lineupId = result.lastInsertRowid;

    const insertArtist = db.prepare(`
      INSERT INTO lineup_artists (lineup_id, slot_position, artist_name, artist_image, artist_mbid, artist_spotify_id, artist_spotify_url, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const artist of artists) {
      insertArtist.run(
        lineupId,
        artist.slot_position,
        artist.artist_name,
        artist.artist_image || null,
        artist.artist_mbid || null,
        artist.artist_spotify_id || null,
        artist.artist_spotify_url || null,
        sanitize(artist.note, 300) || null
      );
    }

    insertTags(lineupId, tags);

    res.status(201).json({ id: lineupId, title, description, is_public });
  } catch (err) {
    console.error('Create lineup error:', err);
    res.status(500).json({ error: 'Failed to create lineup' });
  }
});

// Update lineup
router.put('/:id', authenticateToken, (req, res) => {
  const { is_public, artists, tags } = req.body;
  const title = sanitize(req.body.title, 100);
  const description = sanitize(req.body.description, 500);

  if (!title || !artists || artists.length === 0) {
    return res.status(400).json({ error: 'Title and at least one artist required' });
  }

  if (artists.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 artists allowed' });
  }

  try {
    const lineup = db.prepare('SELECT * FROM lineups WHERE id = ?').get(req.params.id);

    if (!lineup) {
      return res.status(404).json({ error: 'Lineup not found' });
    }

    if (lineup.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this lineup' });
    }

    // Update lineup
    db.prepare('UPDATE lineups SET title = ?, description = ?, is_public = ? WHERE id = ?')
      .run(title, description || null, is_public ? 1 : 0, req.params.id);

    // Delete old artists and insert new ones
    db.prepare('DELETE FROM lineup_artists WHERE lineup_id = ?').run(req.params.id);

    const insertArtist = db.prepare(`
      INSERT INTO lineup_artists (lineup_id, slot_position, artist_name, artist_image, artist_mbid, artist_spotify_id, artist_spotify_url, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const artist of artists) {
      insertArtist.run(
        req.params.id,
        artist.slot_position,
        artist.artist_name,
        artist.artist_image || null,
        artist.artist_mbid || null,
        artist.artist_spotify_id || null,
        artist.artist_spotify_url || null,
        sanitize(artist.note, 300) || null
      );
    }

    // Delete old tags and insert new ones
    db.prepare('DELETE FROM lineup_tags WHERE lineup_id = ?').run(req.params.id);
    insertTags(req.params.id, tags);

    res.json({ id: req.params.id, title, description, is_public });
  } catch (err) {
    console.error('Update lineup error:', err);
    res.status(500).json({ error: 'Failed to update lineup' });
  }
});

// Toggle like on a lineup
router.post('/:id/like', authenticateToken, likeLimiter, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM lineup_likes WHERE user_id = ? AND lineup_id = ?').get(req.user.id, req.params.id);
    if (existing) {
      db.prepare('DELETE FROM lineup_likes WHERE id = ?').run(existing.id);
    } else {
      db.prepare('INSERT INTO lineup_likes (user_id, lineup_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    }
    const count = db.prepare('SELECT COUNT(*) as count FROM lineup_likes WHERE lineup_id = ?').get(req.params.id).count;
    res.json({ liked: !existing, count });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Get like count + user's like status
router.get('/:id/likes', (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM lineup_likes WHERE lineup_id = ?').get(req.params.id).count;
    let liked = false;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        liked = !!db.prepare('SELECT 1 FROM lineup_likes WHERE user_id = ? AND lineup_id = ?').get(decoded.id, req.params.id);
      } catch {}
    }
    res.json({ liked, count });
  } catch (err) {
    console.error('Get likes error:', err);
    res.status(500).json({ error: 'Failed to get likes' });
  }
});

// Get comments for a lineup
router.get('/:id/comments', (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT c.id, c.content, c.created_at, c.user_id, u.username
      FROM lineup_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.lineup_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Add a comment
router.post('/:id/comments', authenticateToken, commentLimiter, (req, res) => {
  const content = sanitize(req.body.content, 500);
  if (!content) {
    return res.status(400).json({ error: 'Comment content required' });
  }
  try {
    const result = db.prepare('INSERT INTO lineup_comments (lineup_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, req.user.id, content);
    const comment = db.prepare(`
      SELECT c.id, c.content, c.created_at, c.user_id, u.username
      FROM lineup_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(comment);
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete own comment
router.delete('/:id/comments/:commentId', authenticateToken, (req, res) => {
  try {
    const comment = db.prepare('SELECT * FROM lineup_comments WHERE id = ? AND lineup_id = ?').get(req.params.commentId, req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    db.prepare('DELETE FROM lineup_comments WHERE id = ?').run(req.params.commentId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Delete lineup
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const lineup = db.prepare('SELECT * FROM lineups WHERE id = ?').get(req.params.id);

    if (!lineup) {
      return res.status(404).json({ error: 'Lineup not found' });
    }

    if (lineup.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this lineup' });
    }

    db.prepare('DELETE FROM lineups WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete lineup error:', err);
    res.status(500).json({ error: 'Failed to delete lineup' });
  }
});

export default router;
