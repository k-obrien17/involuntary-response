import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

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
        ORDER BY la.slot_position) as artists
      FROM lineups l
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(req.user.id);

    const parsed = lineups.map(l => ({
      ...l,
      artists: JSON.parse(l.artists || '[]')
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

    res.json({ ...lineup, artists });
  } catch (err) {
    console.error('Get lineup error:', err);
    res.status(500).json({ error: 'Failed to get lineup' });
  }
});

// Create lineup
router.post('/', authenticateToken, (req, res) => {
  const { is_public, artists } = req.body;
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

    res.status(201).json({ id: lineupId, title, description, is_public });
  } catch (err) {
    console.error('Create lineup error:', err);
    res.status(500).json({ error: 'Failed to create lineup' });
  }
});

// Update lineup
router.put('/:id', authenticateToken, (req, res) => {
  const { is_public, artists } = req.body;
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

    res.json({ id: req.params.id, title, description, is_public });
  } catch (err) {
    console.error('Update lineup error:', err);
    res.status(500).json({ error: 'Failed to update lineup' });
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
