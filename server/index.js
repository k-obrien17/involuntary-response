import 'dotenv/config';
import express from 'express';
import cors from 'cors';

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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Involuntary Response server running on http://localhost:${PORT}`);
});
