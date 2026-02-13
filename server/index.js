import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import lineupsRoutes from './routes/lineups.js';
import artistsRoutes from './routes/artists.js';
import statsRoutes from './routes/stats.js';
import usersRoutes from './routes/users.js';
import db from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
app.use(express.json());

// HTML entity escaping for safe interpolation
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// OG meta tags for social crawlers
const CRAWLER_RE = /bot|crawl|spider|slurp|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Discordbot/i;
app.get('/lineup/:id', (req, res, next) => {
  if (!CRAWLER_RE.test(req.headers['user-agent'] || '')) return next();
  try {
    const lineup = db.prepare('SELECT l.title, l.description, u.username as creator_username FROM lineups l JOIN users u ON l.user_id = u.id WHERE l.id = ?').get(req.params.id);
    if (!lineup) return next();
    const title = escapeHtml(lineup.title);
    const desc = escapeHtml(lineup.description || `A lineup by @${lineup.creator_username || 'anonymous'}`);
    res.send(`<!DOCTYPE html><html><head>
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${desc}" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${desc}" />
    </head><body></body></html>`);
  } catch {
    next();
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/lineups', lineupsRoutes);
app.use('/api/artists', artistsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — prevent stack trace leaks
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🎸 Backyard Marquee server running on http://localhost:${PORT}`);
});
