import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Get public user profile
router.get('/:username', async (req, res) => {
  try {
    const user = await db.get('SELECT id, username, created_at FROM users WHERE username = ?', req.params.username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const lineups = await db.all(`
      SELECT
        l.id,
        l.title,
        l.description,
        l.created_at,
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
      WHERE l.user_id = ? AND l.is_public = 1
      ORDER BY l.created_at DESC
    `, user.id);

    const parsed = lineups.map(l => ({
      ...l,
      artists: JSON.parse(l.artists || '[]'),
      tags: JSON.parse(l.tags || '[]').filter(t => t !== null)
    }));

    res.json({
      username: user.username,
      created_at: user.created_at,
      lineup_count: parsed.length,
      lineups: parsed
    });
  } catch (err) {
    console.error('User profile error:', err);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

export default router;
