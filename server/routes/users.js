import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import db from '../db/index.js';

const router = Router();

// All user admin routes require admin
router.use(authenticateToken, requireAdmin);

// GET /api/users/admin/contributors — List all contributors
router.get('/admin/contributors', async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, email, display_name, username, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      username: u.username,
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
    }));

    res.json(result);
  } catch (err) {
    console.error('List contributors error:', err);
    res.status(500).json({ error: 'Failed to list contributors' });
  }
});

// PATCH /api/users/admin/:id/deactivate — Deactivate contributor
router.patch('/admin/:id/deactivate', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    if (req.user.id === targetId) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    const result = await db.run(
      'UPDATE users SET is_active = 0 WHERE id = ? AND id != ?',
      targetId, req.user.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Contributor deactivated' });
  } catch (err) {
    console.error('Deactivate contributor error:', err);
    res.status(500).json({ error: 'Failed to deactivate contributor' });
  }
});

// PATCH /api/users/admin/:id/activate — Reactivate contributor
router.patch('/admin/:id/activate', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    const result = await db.run(
      'UPDATE users SET is_active = 1 WHERE id = ?',
      targetId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Contributor activated' });
  } catch (err) {
    console.error('Activate contributor error:', err);
    res.status(500).json({ error: 'Failed to activate contributor' });
  }
});

// PATCH /api/users/admin/:id/promote — Promote to admin
router.patch('/admin/:id/promote', async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    if (req.user.id === targetId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = await db.run(
      "UPDATE users SET role = 'admin' WHERE id = ? AND role = 'contributor'",
      targetId
    );

    if (result.changes === 0) {
      return res.status(400).json({ error: 'User is already an admin or not found' });
    }

    res.json({
      message: 'Contributor promoted to admin',
      note: 'Role change takes effect on their next login',
    });
  } catch (err) {
    console.error('Promote contributor error:', err);
    res.status(500).json({ error: 'Failed to promote contributor' });
  }
});

export default router;
