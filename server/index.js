import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import invitesRoutes from './routes/invites.js';
import usersRoutes from './routes/users.js';
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

// Init DB then start server
await initDatabase();

app.listen(PORT, () => {
  console.log(`Involuntary Response server running on http://localhost:${PORT}`);
});
