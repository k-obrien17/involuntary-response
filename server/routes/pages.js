import { Router } from 'express';
import db from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

// GET /api/pages/:slug — public
router.get('/:slug', async (req, res) => {
  try {
    const page = await db.get(
      'SELECT slug, title, body, updated_at FROM site_pages WHERE slug = ?',
      req.params.slug
    );
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  } catch (err) {
    console.error('Get page error:', err);
    res.status(500).json({ error: 'Failed to load page' });
  }
});

// GET /api/pages — admin list
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pages = await db.all('SELECT slug, title, updated_at FROM site_pages ORDER BY slug');
    res.json({ pages });
  } catch (err) {
    console.error('List pages error:', err);
    res.status(500).json({ error: 'Failed to list pages' });
  }
});

// PUT /api/pages/:slug — admin update
router.put('/:slug', authenticateToken, requireAdmin, async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: 'Title too long (max 200 chars)' });
  }
  if (body.length > 50000) {
    return res.status(400).json({ error: 'Body too long (max 50000 chars)' });
  }
  try {
    const result = await db.run(
      'UPDATE site_pages SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE slug = ?',
      title, body, req.user.id, req.params.slug
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ slug: req.params.slug, title, body });
  } catch (err) {
    console.error('Update page error:', err);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

export default router;
