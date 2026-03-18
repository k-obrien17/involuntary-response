import jwt from 'jsonwebtoken';
import db from '../db/index.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
export const JWT_SECRET = process.env.JWT_SECRET;

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {}
  }
  next();
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await db.get(
      'SELECT id, email, role, username, display_name, is_active FROM users WHERE id = ?',
      decoded.id
    );
    if (!user || user.is_active === 0) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      displayName: user.display_name,
    };
    next();
  } catch (err) {
    console.error('Auth DB error for user', decoded.id, err);
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '365d' }
  );
}

export function requireContributor(req, res, next) {
  if (!req.user || (req.user.role !== 'contributor' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Contributor access required' });
  }
  next();
}
