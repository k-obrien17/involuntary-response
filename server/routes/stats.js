import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

function clamp(val, min, max) {
  const n = parseInt(val);
  return isNaN(n) ? min : Math.min(Math.max(n, min), max);
}

// Get leaderboard - top artists by appearances
router.get('/leaderboard', async (req, res) => {
  const safeLimit = clamp(req.query.limit || 50, 1, 100);
  const safeOffset = clamp(req.query.offset || 0, 0, 10000);

  try {
    const artists = await db.all(`
      SELECT
        artist_name,
        artist_image,
        COUNT(*) as lineup_count,
        COUNT(CASE WHEN slot_position = 4 THEN 1 END) as headliner_count,
        COUNT(CASE WHEN slot_position = 3 THEN 1 END) as coheadliner_count,
        ROUND(AVG(slot_position), 2) as avg_position
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      WHERE l.is_public = 1
      GROUP BY LOWER(artist_name)
      ORDER BY lineup_count DESC, headliner_count DESC
      LIMIT ? OFFSET ?
    `, safeLimit, safeOffset);

    const total = await db.get(`
      SELECT COUNT(DISTINCT LOWER(artist_name)) as count
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      WHERE l.is_public = 1
    `);

    res.json({ artists, total: total.count });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get stats for a specific artist
router.get('/artist/:name', async (req, res) => {
  const artistName = decodeURIComponent(req.params.name);

  try {
    // Get artist stats
    const stats = await db.get(`
      SELECT
        artist_name,
        artist_image,
        COUNT(*) as lineup_count,
        COUNT(CASE WHEN slot_position = 4 THEN 1 END) as headliner_count,
        COUNT(CASE WHEN slot_position = 3 THEN 1 END) as coheadliner_count,
        COUNT(CASE WHEN slot_position = 2 THEN 1 END) as special_guest_count,
        COUNT(CASE WHEN slot_position = 1 THEN 1 END) as opener_count,
        COUNT(CASE WHEN slot_position = 0 THEN 1 END) as local_opener_count,
        ROUND(AVG(slot_position), 2) as avg_position
      FROM lineup_artists la
      JOIN lineups l ON la.lineup_id = l.id
      WHERE l.is_public = 1 AND LOWER(artist_name) = LOWER(?)
      GROUP BY LOWER(artist_name)
    `, artistName);

    if (!stats) {
      return res.status(404).json({ error: 'Artist not found in any lineups' });
    }

    // Get lineups featuring this artist
    const lineups = await db.all(`
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
    `, artistName);

    const parsedLineups = lineups.map(l => ({
      ...l,
      all_artists: JSON.parse(l.all_artists || '[]')
    }));

    // Get commonly paired artists
    const pairings = await db.all(`
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
    `, artistName, artistName);

    res.json({ stats, lineups: parsedLineups, pairings });
  } catch (err) {
    console.error('Artist stats error:', err);
    res.status(500).json({ error: 'Failed to get artist stats' });
  }
});

// Browse all public lineups
router.get('/browse', async (req, res) => {
  const { sort = 'recent', tag } = req.query;
  const safeLimit = clamp(req.query.limit || 20, 1, 50);
  const safeOffset = clamp(req.query.offset || 0, 0, 10000);

  try {
    let orderBy;
    if (sort === 'likes') {
      orderBy = 'like_count DESC, l.created_at DESC';
    } else if (sort === 'oldest') {
      orderBy = 'l.created_at ASC';
    } else {
      orderBy = 'l.created_at DESC';
    }

    const tagFilter = tag ? 'AND EXISTS (SELECT 1 FROM lineup_tags lt WHERE lt.lineup_id = l.id AND lt.tag = ?)' : '';
    const params = tag ? [tag, safeLimit, safeOffset] : [safeLimit, safeOffset];
    const countParams = tag ? [tag] : [];

    const lineups = await db.all(`
      SELECT
        l.id,
        l.title,
        l.description,
        l.created_at,
        u.username as creator_username,
        (SELECT COUNT(*) FROM lineup_likes ll WHERE ll.lineup_id = l.id) as like_count,
        (SELECT json_group_array(json_object(
          'artist_name', la.artist_name,
          'artist_image', la.artist_image,
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
      JOIN users u ON l.user_id = u.id
      WHERE l.is_public = 1 ${tagFilter}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, ...params);

    const parsed = lineups.map(l => ({
      ...l,
      artists: JSON.parse(l.artists || '[]'),
      tags: JSON.parse(l.tags || '[]').filter(t => t !== null)
    }));

    const total = await db.get(`
      SELECT COUNT(*) as count FROM lineups l WHERE l.is_public = 1 ${tagFilter}
    `, ...countParams);

    res.json({ lineups: parsed, total: total.count });
  } catch (err) {
    console.error('Browse error:', err);
    res.status(500).json({ error: 'Failed to browse lineups' });
  }
});

// Get all tags with counts (public lineups only)
router.get('/tags', async (req, res) => {
  try {
    const tags = await db.all(`
      SELECT lt.tag, COUNT(*) as count
      FROM lineup_tags lt
      JOIN lineups l ON lt.lineup_id = l.id
      WHERE l.is_public = 1
      GROUP BY lt.tag
      ORDER BY count DESC
      LIMIT 50
    `);
    res.json(tags);
  } catch (err) {
    console.error('Tags error:', err);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Search artists in the database
router.get('/search-artists', async (req, res) => {
  const { q } = req.query;
  const safeLimit = clamp(req.query.limit || 20, 1, 50);

  if (!q || q.trim().length === 0) {
    return res.json({ artists: [] });
  }

  try {
    const artists = await db.all(`
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
    `, `%${q}%`, safeLimit);

    res.json({ artists });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get site-wide stats
router.get('/site', async (req, res) => {
  try {
    const stats = await db.get(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM lineups WHERE is_public = 1) as total_lineups,
        (SELECT COUNT(DISTINCT LOWER(artist_name)) FROM lineup_artists la JOIN lineups l ON la.lineup_id = l.id WHERE l.is_public = 1) as unique_artists
    `);

    res.json(stats);
  } catch (err) {
    console.error('Site stats error:', err);
    res.status(500).json({ error: 'Failed to get site stats' });
  }
});

export default router;
