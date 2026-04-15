import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import invitesRoutes from './routes/invites.js';
import usersRoutes from './routes/users.js';
import profileRoutes from './routes/profile.js';
import browseRoutes from './routes/browse.js';
import postsRoutes from './routes/posts.js';
import embedsRoutes from './routes/embeds.js';
import feedRoutes from './routes/feed.js';
import searchRoutes from './routes/search.js';
import analyticsRoutes from './routes/analytics.js';
import { initDatabase } from './db/index.js';
import { startScheduler } from './lib/scheduler.js';
import { securityHeaders, validateOrigin } from './middleware/security.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers (helmet + CSP + X-XSS-Protection via security.js)
app.use(securityHeaders);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

// Origin validation (CSRF defense-in-depth for state-changing requests)
app.use(validateOrigin);

// Global rate limiter — 200 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/users', profileRoutes);  // Profile routes first (PUT /me, GET /:username/profile)
app.use('/api/users', usersRoutes);    // Admin routes second (all require admin middleware)
app.use('/api/browse', browseRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/embeds', embedsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — prevent stack trace leaks
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Validate required environment variables before startup
function validateEnv() {
  const required = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_DISPLAY_NAME'];
  if (process.env.NODE_ENV === 'production') {
    required.push('FRONTEND_URL');
  }
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}. Set these before starting the server.`);
  }

  if (!process.env.SMTP_HOST) {
    console.warn('WARNING: SMTP_HOST not configured — password reset emails will be unavailable');
  }
}

validateEnv();

// Init DB then start server
await initDatabase();
startScheduler();

app.listen(PORT, () => {
  console.log(`Involuntary Response server running on http://localhost:${PORT}`);
});
