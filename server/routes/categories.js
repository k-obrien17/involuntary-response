import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import db from '../db/index.js';

const router = Router();

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET / — public list of all categories
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT id, name, slug FROM categories ORDER BY name');
    res.json({ categories: rows });
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// POST / — admin creates a category
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = (req.body.name || '').trim().slice(0, 100);
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const slug = toSlug(name);
    if (!slug) return res.status(400).json({ error: 'Invalid category name' });

    const existing = await db.get('SELECT 1 FROM categories WHERE slug = ?', slug);
    if (existing) return res.status(409).json({ error: 'Category already exists' });

    const result = await db.run(
      'INSERT INTO categories (name, slug) VALUES (?, ?)',
      name, slug
    );
    res.status(201).json({ id: result.lastInsertRowid, name, slug });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// DELETE /:id — admin deletes a category (nulls out posts using it)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    await db.run('UPDATE posts SET category_id = NULL WHERE category_id = ?', id);
    await db.run('DELETE FROM categories WHERE id = ?', id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
