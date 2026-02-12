import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'backyard-marquee.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lineups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    is_public INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lineup_artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lineup_id INTEGER NOT NULL,
    slot_position INTEGER NOT NULL,
    artist_name TEXT NOT NULL,
    artist_image TEXT,
    artist_mbid TEXT,
    FOREIGN KEY (lineup_id) REFERENCES lineups(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_lineups_user_id ON lineups(user_id);
  CREATE INDEX IF NOT EXISTS idx_lineup_artists_lineup_id ON lineup_artists(lineup_id);
`);

// Migration runner
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const migrations = [
  { id: 1, name: 'add_lineups_description', sql: `ALTER TABLE lineups ADD COLUMN description TEXT` },
  { id: 2, name: 'add_lineup_artists_note', sql: `ALTER TABLE lineup_artists ADD COLUMN note TEXT` },
  { id: 3, name: 'add_users_username', sql: `ALTER TABLE users ADD COLUMN username TEXT` },
  { id: 4, name: 'add_users_username_index', sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)` },
  { id: 5, name: 'add_spotify_id', sql: `ALTER TABLE lineup_artists ADD COLUMN artist_spotify_id TEXT` },
  { id: 6, name: 'add_spotify_url', sql: `ALTER TABLE lineup_artists ADD COLUMN artist_spotify_url TEXT` },
];

const checkMigration = db.prepare('SELECT 1 FROM migrations WHERE name = ?');
const recordMigration = db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)');

for (const m of migrations) {
  if (!checkMigration.get(m.name)) {
    try {
      db.exec(m.sql);
    } catch {
      // Column/index may already exist from before migration tracking
    }
    recordMigration.run(m.id, m.name);
  }
}

export default db;
