import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Get leaderboard - top artists by appearances
router.get('/leaderboard', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const artists = db.prepare(`
      SELECT
        artist_name,
        artist_image,
        COUNT(*) as lineup_count,
        COUNT(CASE WHEN slot_position = 0 THEN 1 END) as headliner_count,
        COUNT(CASE WHEN slot_position = 1 THEN 1 END) as coheadliner_count,
        ROUND(AVG(slot_position), 2) as avg_position
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      WHERE l.is_public = 1
      GROUP BY LOWER(artist_name)
      ORDER BY lineup_count DESC, headliner_count DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(DISTINCT LOWER(artist_name)) as count
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      WHERE l.is_public = 1
    `).get();

    res.json({ artists, total: total.count });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get stats for a specific artist
router.get('/artist/:name', (req, res) => {
  const artistName = decodeURIComponent(req.params.name);

  try {
    // Get artist stats
    const stats = db.prepare(`
      SELECT
        artist_name,
        artist_image,
        COUNT(*) as lineup_count,
        COUNT(CASE WHEN slot_position = 0 THEN 1 END) as headliner_count,
        COUNT(CASE WHEN slot_position = 1 THEN 1 END) as coheadliner_count,
        COUNT(CASE WHEN slot_position = 2 THEN 1 END) as special_guest_count,
        COUNT(CASE WHEN slot_position = 3 THEN 1 END) as opener_count,
        COUNT(CASE WHEN slot_position = 4 THEN 1 END) as local_opener_count,
        ROUND(AVG(slot_position), 2) as avg_position
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      WHERE l.is_public = 1 AND LOWER(artist_name) = LOWER(?)
      GROUP BY LOWER(artist_name)
    `).get(artistName);

    if (!stats) {
      return res.status(404).json({ error: 'Artist not found in any lineups' });
    }

    // Get lineups featuring this artist
    const lineups = db.prepare(`
      SELECT
        l.id,
        l.title,
        l.description,
        l.created_at,
        la.slot_position,
        la.note as artist_note,
        u.username as creator_username,
        (SELECT json_group_array(json_object(
          'artist_name', la2.artist_name,
          'slot_position', la2.slot_position,
          'note', la2.note
        ))
        FROM lineup_artists la2
        WHERE la2.lineup_id = l.id
        ORDER BY la2.slot_position) as all_artists
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE l.is_public = 1 AND LOWER(la.artist_name) = LOWER(?)
      ORDER BY l.created_at DESC
      LIMIT 20
    `).all(artistName);

    const parsedLineups = lineups.map(l => ({
      ...l,
      all_artists: JSON.parse(l.all_artists || '[]')
    }));

    // Get commonly paired artists
    const pairings = db.prepare(`
      SELECT
        la2.artist_name,
        COUNT(*) as pair_count
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      JOIN lineup_artists la2 ON la.lineup_id = la2.lineup_id
      WHERE l.is_public = 1
        AND LOWER(la.artist_name) = LOWER(?)
        AND LOWER(la2.artist_name) != LOWER(?)
      GROUP BY LOWER(la2.artist_name)
      ORDER BY pair_count DESC
      LIMIT 10
    `).all(artistName, artistName);

    res.json({ stats, lineups: parsedLineups, pairings });
  } catch (err) {
    console.error('Artist stats error:', err);
    res.status(500).json({ error: 'Failed to get artist stats' });
  }
});

// Browse all public lineups
router.get('/browse', (req, res) => {
  const { limit = 20, offset = 0, sort = 'recent' } = req.query;

  try {
    const orderBy = sort === 'recent' ? 'l.created_at DESC' : 'l.created_at ASC';

    const lineups = db.prepare(`
      SELECT
        l.id,
        l.title,
        l.description,
        l.created_at,
        u.username as creator_username,
        (SELECT json_group_array(json_object(
          'artist_name', la.artist_name,
          'artist_image', la.artist_image,
          'slot_position', la.slot_position,
          'note', la.note
        ))
        FROM lineup_artists la
        WHERE la.lineup_id = l.id
        ORDER BY la.slot_position) as artists
      FROM lineups l
      JOIN users u ON l.user_id = u.id
      WHERE l.is_public = 1
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));

    const parsed = lineups.map(l => ({
      ...l,
      artists: JSON.parse(l.artists || '[]')
    }));

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM lineups WHERE is_public = 1
    `).get();

    res.json({ lineups: parsed, total: total.count });
  } catch (err) {
    console.error('Browse error:', err);
    res.status(500).json({ error: 'Failed to browse lineups' });
  }
});

// Search artists in the database
router.get('/search-artists', (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q || q.trim().length === 0) {
    return res.json({ artists: [] });
  }

  try {
    const artists = db.prepare(`
      SELECT
        artist_name,
        artist_image,
        COUNT(*) as lineup_count
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      WHERE l.is_public = 1 AND artist_name LIKE ?
      GROUP BY LOWER(artist_name)
      ORDER BY lineup_count DESC
      LIMIT ?
    `).all(`%${q}%`, parseInt(limit));

    res.json({ artists });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get site-wide stats
router.get('/site', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM lineups WHERE is_public = 1) as total_lineups,
        (SELECT COUNT(DISTINCT LOWER(artist_name)) FROM lineup_artists la JOIN lineups l ON la.lineup_id = l.id WHERE l.is_public = 1) as unique_artists
    `).get();

    res.json(stats);
  } catch (err) {
    console.error('Site stats error:', err);
    res.status(500).json({ error: 'Failed to get site stats' });
  }
});

export default router;
