import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Convert BigInt values to Number for all fields in a row object.
// libsql returns INTEGER columns as BigInt; coercing here avoids
// strict-equality mismatches (e.g. 1n !== 1) in application code.
function coerceRow(row) {
  if (!row) return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return out;
}

// Thin async wrapper matching the old better-sqlite3 call pattern
const db = {
  async get(sql, ...params) {
    const result = await client.execute({ sql, args: params });
    return coerceRow(result.rows[0]) || null;
  },
  async all(sql, ...params) {
    const result = await client.execute({ sql, args: params });
    return result.rows.map(coerceRow);
  },
  async run(sql, ...params) {
    const result = await client.execute({ sql, args: params });
    return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.rowsAffected };
  },
  async exec(sql) {
    await client.executeMultiple(sql);
  },
};

async function seedAdmin() {
  // Admin env vars are validated at startup (server/index.js validateEnv)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';

  const existing = await db.get('SELECT 1 FROM users WHERE role = ?', 'admin');
  if (existing) return; // Admin already exists

  const hash = await bcrypt.hash(adminPassword, 10);
  await db.run(
    'INSERT INTO users (email, password_hash, display_name, username, role) VALUES (?, ?, ?, ?, ?)',
    adminEmail, hash, adminDisplayName, 'admin', 'admin'
  );
  console.log('Admin account seeded');
}

export async function initDatabase() {
  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'contributor',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invite_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL,
      note TEXT,
      used_by INTEGER,
      used_at DATETIME,
      revoked_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (used_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
  `);

  // Migration runner
  const migrations = [
    {
      id: 1,
      name: 'create_posts_tables',
      sql: `
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slug TEXT UNIQUE NOT NULL,
          body TEXT NOT NULL,
          author_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (author_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS post_embeds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER UNIQUE NOT NULL,
          provider TEXT NOT NULL,
          embed_type TEXT NOT NULL,
          embed_url TEXT NOT NULL,
          original_url TEXT NOT NULL,
          title TEXT,
          thumbnail_url TEXT,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS post_tags (
          post_id INTEGER NOT NULL,
          tag TEXT NOT NULL,
          PRIMARY KEY (post_id, tag),
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
        CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);
      `,
    },
    {
      id: 2,
      name: 'add_embed_html_column',
      sql: `ALTER TABLE post_embeds ADD COLUMN embed_html TEXT;`,
    },
    {
      id: 3,
      name: 'add_post_artists_and_user_bio',
      sql: `
        CREATE TABLE IF NOT EXISTS post_artists (
          post_id INTEGER NOT NULL,
          artist_name TEXT NOT NULL,
          artist_image TEXT,
          spotify_id TEXT,
          PRIMARY KEY (post_id, artist_name),
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_post_artists_name ON post_artists(artist_name COLLATE NOCASE);
        ALTER TABLE users ADD COLUMN bio TEXT;
      `,
    },
    {
      id: 4,
      name: 'add_post_artists_source',
      sql: `ALTER TABLE post_artists ADD COLUMN source TEXT DEFAULT 'spotify';`,
    },
    {
      id: 5,
      name: 'add_post_status_likes_comments',
      sql: `
        ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
        ALTER TABLE posts ADD COLUMN published_at DATETIME;
        UPDATE posts SET published_at = created_at WHERE published_at IS NULL;
        CREATE TABLE IF NOT EXISTS post_likes (
          post_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (post_id, user_id),
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS post_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          body TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
        CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
        CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);
      `,
    },
    {
      id: 6,
      name: 'add_scheduled_at',
      sql: `ALTER TABLE posts ADD COLUMN scheduled_at DATETIME;`,
    },
    {
      id: 7,
      name: 'create_site_pages',
      sql: `
        CREATE TABLE IF NOT EXISTS site_pages (
          slug TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          FOREIGN KEY (updated_by) REFERENCES users(id)
        );
        INSERT OR IGNORE INTO site_pages (slug, title, body) VALUES (
          'about',
          'About',
          'A place for visceral, honest reactions to music. Not reviews. Not ratings. Someone heard a song and needed to write about it. That impulse — the one that hits before you can think of a star count — is what lives here.

Every post has the music embedded right there. You read the reaction, you press play, you decide for yourself. No intermediary telling you what to feel first.

Think of it as a feed of musical moments. Not a recommendation engine, not a playlist generator. Just people and the songs that stopped them in their tracks.'
        );
      `,
    },
    {
      id: 8,
      name: 'create_categories',
      sql: `
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE posts ADD COLUMN category_id INTEGER REFERENCES categories(id);
        INSERT OR IGNORE INTO categories (name, slug) VALUES ('Wake Up With', 'wake-up-with');
      `,
    },
    {
      id: 9,
      name: 'add_category_icon',
      sql: `
        ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT '';
        UPDATE categories SET icon = '☀️' WHERE slug = 'wake-up-with';
      `,
    },
    {
      id: 10,
      name: 'add_post_format',
      sql: `ALTER TABLE posts ADD COLUMN format TEXT NOT NULL DEFAULT 'standard';`,
    },
  ];

  for (const m of migrations) {
    const applied = await db.get('SELECT 1 FROM migrations WHERE name = ?', m.name);
    if (!applied) {
      try {
        await db.exec(m.sql);
      } catch (err) {
        const msg = err?.message || '';
        if (msg.includes('already exists') || msg.includes('duplicate column')) {
          // Expected when migration partially applied — safe to continue
        } else {
          console.error(`Migration "${m.name}" failed:`, msg);
          throw err;
        }
      }
      await db.run('INSERT OR IGNORE INTO migrations (id, name) VALUES (?, ?)', m.id, m.name);
    }
  }

  // Seed admin account if no admin exists
  await seedAdmin();

  console.log('Database initialized');
}

export default db;
