import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { sendResetEmail, isEmailConfigured } from '../lib/email.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, try again later' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, try again later' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, try again later' },
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

// Username generation from display name
function generateUsername(displayName) {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);

  return base || 'user';
}

async function ensureUniqueUsername(displayName) {
  let username = generateUsername(displayName);
  let existing = await db.get('SELECT 1 FROM users WHERE username = ?', username);
  let suffix = 1;
  while (existing) {
    const truncated = generateUsername(displayName).substring(0, 17);
    username = `${truncated}-${suffix}`;
    existing = await db.get('SELECT 1 FROM users WHERE username = ?', username);
    suffix++;
  }
  return username;
}

// Basic email format check
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { email, password, displayName: rawDisplayName, token } = req.body;

  if (!email || !password || !rawDisplayName || !token) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Sanitize displayName: strip HTML tags and limit length
  const displayName = rawDisplayName.replace(/<[^>]*>/g, '').trim().substring(0, 50);
  if (!displayName) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  try {
    // Validate invite token
    const invite = await db.get(
      'SELECT * FROM invite_tokens WHERE token = ? AND used_by IS NULL AND revoked_at IS NULL',
      token
    );
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    // Check 7-day expiry in JavaScript (add 'Z' for UTC per pitfall #2)
    if (Date.now() - new Date(invite.created_at + 'Z').getTime() > 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'This invite has expired' });
    }

    // Check email uniqueness
    const existingEmail = await db.get('SELECT 1 FROM users WHERE email = ?', email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate unique username from display name
    const username = await ensureUniqueUsername(displayName);

    // Hash password and create user
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, display_name, username, role) VALUES (?, ?, ?, ?, ?)',
      email, hash, displayName, username, 'contributor'
    );

    // Mark invite as used atomically (per pitfall #3 — race condition protection)
    const updateResult = await db.run(
      'UPDATE invite_tokens SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE token = ? AND used_by IS NULL AND revoked_at IS NULL',
      result.lastInsertRowid, token
    );
    if (updateResult.changes === 0) {
      // Race condition — invite was used between our check and update
      // Roll back user creation by deactivating the account
      await db.run('DELETE FROM users WHERE id = ?', result.lastInsertRowid);
      return res.status(400).json({ error: 'Invalid or already used invite' });
    }

    const user = { id: result.lastInsertRowid, email, displayName, username, role: 'contributor' };
    const jwtToken = generateToken(user);
    res.status(201).json({ token: jwtToken, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Rate limiter for public reader registration (stricter — open endpoint)
const readerRegLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts, try again later' },
});

// POST /api/auth/register-reader
router.post('/register-reader', readerRegLimiter, async (req, res) => {
  const { email, password, displayName: rawDisplayName } = req.body;

  if (!email || !password || !rawDisplayName) {
    return res.status(400).json({ error: 'Email, password, and display name are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Sanitize displayName: strip HTML tags and limit length
  const displayName = rawDisplayName.replace(/<[^>]*>/g, '').trim().substring(0, 50);
  if (!displayName) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  try {
    // Check email uniqueness
    const existingEmail = await db.get('SELECT 1 FROM users WHERE email = ?', email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate unique username from display name
    const username = await ensureUniqueUsername(displayName);

    // Hash password and create user with role='reader'
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, display_name, username, role) VALUES (?, ?, ?, ?, ?)',
      email, hash, displayName, username, 'reader'
    );

    const user = { id: result.lastInsertRowid, email, displayName, username, role: 'reader' };
    const jwtToken = generateToken(user);
    res.status(201).json({ token: jwtToken, user });
  } catch (err) {
    console.error('Reader registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user || user.is_active === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const jwtToken = generateToken(user);
    res.json({
      token: jwtToken,
      user: { id: user.id, email: user.email, displayName: user.display_name, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;

  // Return 503 early if email is not configured
  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'Password reset is temporarily unavailable. Please contact the site administrator.' });
  }

  // Always respond 200 to prevent email enumeration
  res.json({ message: 'If an account exists, a reset link has been sent' });

  try {
    if (!email) return;

    const user = await db.get('SELECT id FROM users WHERE email = ? AND is_active = 1', email);
    if (!user) return;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    await db.run(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      user.id, token, expiresAt
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    await sendResetEmail(email, resetUrl);
  } catch (err) {
    console.error('Password reset error:', err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const resetToken = await db.get(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL',
      token
    );
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check expiry
    if (new Date(resetToken.expires_at + 'Z').getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password and update user
    const hash = await bcrypt.hash(password, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', hash, resetToken.user_id);

    // Mark reset token as used
    await db.run(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
      resetToken.id
    );

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
