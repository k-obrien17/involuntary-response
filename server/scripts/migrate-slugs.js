import { createClient } from '@libsql/client';
import 'dotenv/config';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function run() {
  const posts = await client.execute(
    `SELECT p.id, p.slug, pe.title as embed_title
     FROM posts p
     LEFT JOIN post_embeds pe ON pe.post_id = p.id
     ORDER BY p.id`
  );

  let updated = 0;
  let skipped = 0;

  for (const post of posts.rows) {
    const currentSlug = post.slug;

    // Skip if slug already looks descriptive (contains a letter and is > 10 chars without looking like a nanoid)
    const looksDescriptive = /^[a-z].*[a-z]/.test(currentSlug) && !currentSlug.match(/^[a-zA-Z0-9_-]{21}$/);
    if (looksDescriptive) {
      skipped++;
      continue;
    }

    // Need an embed title to generate a good slug
    if (!post.embed_title) {
      console.log(`  SKIP id=${post.id} slug=${currentSlug} — no embed title`);
      skipped++;
      continue;
    }

    const newBase = slugify(post.embed_title);
    if (!newBase) {
      console.log(`  SKIP id=${post.id} slug=${currentSlug} — slugify produced empty`);
      skipped++;
      continue;
    }

    // Check for collision
    const existing = await client.execute({
      sql: 'SELECT id FROM posts WHERE slug = ? AND id != ?',
      args: [newBase, post.id],
    });

    const finalSlug = existing.rows.length > 0 ? `${newBase}-${post.id}` : newBase;

    await client.execute({
      sql: 'UPDATE posts SET slug = ? WHERE id = ?',
      args: [finalSlug, post.id],
    });

    console.log(`  OK   id=${post.id} "${currentSlug}" → "${finalSlug}"`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
