import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import { initDatabase } from './db/index.js';
import { startScheduler } from './lib/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: [
        "'self'",
        "https://open.spotify.com",
        "https://embed.music.apple.com",
        "https://www.youtube.com",
        "https://w.soundcloud.com",
        "https://bandcamp.com",
        "https://*.bandcamp.com",
      ],
      imgSrc: ["'self'", "https:", "data:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — prevent stack trace leaks
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Init DB then start server
await initDatabase();
startScheduler();

app.listen(PORT, () => {
  console.log(`Involuntary Response server running on http://localhost:${PORT}`);
});
