import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Thin async wrapper matching the old better-sqlite3 call pattern
const db = {
  async get(sql, ...params) {
    const result = await client.execute({ sql, args: params });
    return result.rows[0] || null;
  },
  async all(sql, ...params) {
    const result = await client.execute({ sql, args: params });
    return result.rows;
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
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';

  if (!adminEmail || !adminPassword) {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD set, skipping admin seed');
    return;
  }

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
  ];

  for (const m of migrations) {
    const applied = await db.get('SELECT 1 FROM migrations WHERE name = ?', m.name);
    if (!applied) {
      try {
        await db.exec(m.sql);
      } catch {
        // Column/index may already exist
      }
      await db.run('INSERT INTO migrations (id, name) VALUES (?, ?)', m.id, m.name);
    }
  }

  // Seed admin account if no admin exists
  await seedAdmin();

  console.log('Database initialized');
}

export default db;
