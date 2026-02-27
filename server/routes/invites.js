import { Router } from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import db from '../db/index.js';

const router = Router();

// All invite routes require admin
router.use(authenticateToken, requireAdmin);

// POST /api/invites — Create invite
router.post('/', async (req, res) => {
  try {
    const note = req.body.note ? String(req.body.note).trim().substring(0, 200) : null;
    const token = crypto.randomUUID();

    const result = await db.run(
      'INSERT INTO invite_tokens (token, created_by, note) VALUES (?, ?, ?)',
      token, req.user.id, note
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/register?token=${token}`;

    res.status(201).json({
      id: result.lastInsertRowid,
      token,
      note,
      createdAt: new Date().toISOString(),
      inviteUrl,
    });
  } catch (err) {
    console.error('Create invite error:', err);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// GET /api/invites — List all invites
router.get('/', async (req, res) => {
  try {
    const invites = await db.all(`
      SELECT
        i.id,
        i.token,
        i.note,
        i.created_at,
        i.used_at,
        i.revoked_at,
        i.created_by,
        i.used_by,
        creator.display_name AS creator_display_name,
        creator.id AS creator_id,
        consumer.display_name AS consumer_display_name,
        consumer.id AS consumer_id,
        consumer.username AS consumer_username
      FROM invite_tokens i
      LEFT JOIN users creator ON creator.id = i.created_by
      LEFT JOIN users consumer ON consumer.id = i.used_by
      ORDER BY i.created_at DESC
    `);

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const result = invites.map(inv => {
      let status;
      if (inv.revoked_at) {
        status = 'revoked';
      } else if (inv.used_by) {
        status = 'used';
      } else if (Date.now() - new Date(inv.created_at + 'Z').getTime() > SEVEN_DAYS_MS) {
        status = 'expired';
      } else {
        status = 'pending';
      }

      return {
        id: inv.id,
        token: inv.token,
        note: inv.note,
        status,
        createdBy: { id: inv.creator_id, displayName: inv.creator_display_name },
        usedBy: inv.used_by
          ? { id: inv.consumer_id, displayName: inv.consumer_display_name, username: inv.consumer_username }
          : null,
        createdAt: inv.created_at,
        usedAt: inv.used_at,
        revokedAt: inv.revoked_at,
        inviteUrl: `${frontendUrl}/register?token=${inv.token}`,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('List invites error:', err);
    res.status(500).json({ error: 'Failed to list invites' });
  }
});

// PATCH /api/invites/:id/revoke — Revoke unused invite
router.patch('/:id/revoke', async (req, res) => {
  try {
    const result = await db.run(
      'UPDATE invite_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND used_by IS NULL AND revoked_at IS NULL',
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Invite already used or revoked' });
    }

    res.json({ message: 'Invite revoked' });
  } catch (err) {
    console.error('Revoke invite error:', err);
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
});

export default router;
