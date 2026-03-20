import { Router } from 'express';
import { authenticateToken, requireContributor } from '../middleware/auth.js';
import db from '../db/index.js';

const router = Router();

// All analytics routes require contributor auth
router.use(authenticateToken, requireContributor);

// Sort column whitelist — safe from SQL injection
const SORT_COLUMNS = {
  likes: 'like_count DESC, p.published_at DESC',
  comments: 'comment_count DESC, p.published_at DESC',
  recent: 'p.published_at DESC',
};

// GET /api/analytics/me — per-post engagement stats
router.get('/me', async (req, res) => {
  try {
    const sort = req.query.sort || 'likes';
    const orderBy = SORT_COLUMNS[sort] || SORT_COLUMNS.likes;

    const rows = await db.all(
      `SELECT p.id, p.slug, p.body, p.created_at, p.published_at,
              pe.title AS embed_title, pe.thumbnail_url, pe.provider,
              COALESCE(lc.like_count, 0) AS like_count,
              COALESCE(cc.comment_count, 0) AS comment_count
       FROM posts p
       LEFT JOIN post_embeds pe ON pe.post_id = p.id
       LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM post_likes GROUP BY post_id) lc ON lc.post_id = p.id
       LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM post_comments GROUP BY post_id) cc ON cc.post_id = p.id
       WHERE p.author_id = ? AND p.status = 'published'
       ORDER BY ${orderBy}`,
      req.user.id
    );

    let totalLikes = 0;
    let totalComments = 0;

    const posts = rows.map((row) => {
      const likeCount = Number(row.like_count);
      const commentCount = Number(row.comment_count);
      totalLikes += likeCount;
      totalComments += commentCount;

      return {
        slug: row.slug,
        body: row.body && row.body.length > 120
          ? row.body.slice(0, 120) + '...'
          : row.body,
        embedTitle: row.embed_title,
        thumbnailUrl: row.thumbnail_url,
        provider: row.provider,
        publishedAt: row.published_at,
        likeCount,
        commentCount,
      };
    });

    res.json({ posts, totalLikes, totalComments });
  } catch (err) {
    console.error('Analytics /me error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/me/artists — top artists by post count
router.get('/me/artists', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT pa.artist_name, pa.artist_image, COUNT(DISTINCT pa.post_id) AS post_count
       FROM post_artists pa
       JOIN posts p ON p.id = pa.post_id
       WHERE p.author_id = ? AND p.status = 'published'
       GROUP BY pa.artist_name
       ORDER BY post_count DESC, pa.artist_name ASC
       LIMIT 20`,
      req.user.id
    );

    const artists = rows.map((row) => ({
      name: row.artist_name,
      image: row.artist_image,
      postCount: Number(row.post_count),
    }));

    res.json({ artists });
  } catch (err) {
    console.error('Analytics /me/artists error:', err);
    res.status(500).json({ error: 'Failed to fetch artist analytics' });
  }
});

// Compute posting streak from sorted date strings (desc)
function computeStreak(dates) {
  if (!dates.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today - 86400000).toISOString().slice(0, 10);

  let streak = 0;
  let checkDate = todayStr;

  // If no post today, check if yesterday has one (grace period)
  if (dates[0] !== todayStr) {
    if (dates[0] !== yesterdayStr) return 0;
    checkDate = yesterdayStr;
  }

  for (const d of dates) {
    if (d === checkDate) {
      streak++;
      const prev = new Date(checkDate);
      prev.setDate(prev.getDate() - 1);
      checkDate = prev.toISOString().slice(0, 10);
    } else if (d < checkDate) {
      break;
    }
  }
  return streak;
}

// GET /api/analytics/me/activity — total posts, this month, streak
router.get('/me/activity', async (req, res) => {
  try {
    const totalRow = await db.get(
      `SELECT COUNT(*) AS total_posts FROM posts WHERE author_id = ? AND status = 'published'`,
      req.user.id
    );

    const monthRow = await db.get(
      `SELECT COUNT(*) AS posts_this_month FROM posts WHERE author_id = ? AND status = 'published' AND published_at >= date('now', 'start of month')`,
      req.user.id
    );

    const streakRows = await db.all(
      `SELECT DISTINCT DATE(published_at) AS pub_date
       FROM posts
       WHERE author_id = ? AND status = 'published'
       ORDER BY pub_date DESC
       LIMIT 365`,
      req.user.id
    );

    const dates = streakRows.map((r) => r.pub_date);
    const currentStreak = computeStreak(dates);

    res.json({
      totalPosts: Number(totalRow.total_posts),
      postsThisMonth: Number(monthRow.posts_this_month),
      currentStreak,
    });
  } catch (err) {
    console.error('Analytics /me/activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
});

export default router;
