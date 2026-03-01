import { Router } from 'express';
import { Feed } from 'feed';
import db from '../db/index.js';

const router = Router();

// GET / — RSS feed of recent posts
router.get('/', async (req, res) => {
  try {
    const siteUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const feed = new Feed({
      title: 'Involuntary Response',
      description: 'Short-form music takes from people who care about music.',
      id: siteUrl,
      link: siteUrl,
      language: 'en',
      copyright: `${new Date().getFullYear()} Involuntary Response`,
    });

    // Fetch 20 most recent published posts
    const posts = await db.all(
      `SELECT p.id, p.slug, p.body, p.created_at, p.published_at,
              u.display_name AS author_display_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.status = 'published'
       ORDER BY p.published_at DESC
       LIMIT 20`
    );

    if (posts.length === 0) {
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(feed.rss2());
    }

    // Batch-fetch embeds for these posts
    const postIds = posts.map((p) => p.id);
    const ph = postIds.map(() => '?').join(',');
    const embeds = await db.all(
      `SELECT post_id, title, original_url FROM post_embeds WHERE post_id IN (${ph})`,
      ...postIds
    );

    const embedMap = {};
    for (const e of embeds) {
      embedMap[e.post_id] = { title: e.title, originalUrl: e.original_url };
    }

    // Build feed items
    for (const post of posts) {
      const embed = embedMap[post.id];
      const itemTitle = embed?.title
        ? `${post.author_display_name} on ${embed.title}`
        : `Post by ${post.author_display_name}`;

      let content = `<p>${post.body}</p>`;
      if (embed?.originalUrl) {
        content += `<p><a href="${embed.originalUrl}">${embed.title || 'Listen'}</a></p>`;
      }

      feed.addItem({
        title: itemTitle,
        id: `${siteUrl}/posts/${post.slug}`,
        link: `${siteUrl}/posts/${post.slug}`,
        description: post.body.slice(0, 200),
        content,
        date: new Date(post.published_at || post.created_at),
        author: [{ name: post.author_display_name }],
      });
    }

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(feed.rss2());
  } catch (err) {
    console.error('RSS feed error:', err);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
});

export default router;
