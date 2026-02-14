import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts, try again later' } });

router.post('/google', authLimiter, async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Missing credential' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;

    // Check for existing user by google_id
    let user = await db.get('SELECT * FROM users WHERE google_id = ?', googleId);

    if (!user) {
      // Auto-generate username from email prefix
      const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 17);
      let username = prefix;
      let suffix = 0;

      while (await db.get('SELECT 1 FROM users WHERE username = ?', username)) {
        suffix++;
        username = `${prefix.substring(0, 17)}${suffix}`;
      }

      const result = await db.run(
        'INSERT INTO users (username, email, password_hash, google_id) VALUES (?, ?, ?, ?)',
        username, email, 'google_oauth', googleId
      );

      user = { id: result.lastInsertRowid, username, email, google_id: googleId };
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

export default router;
