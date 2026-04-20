import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

const SITE_URL = process.env.FRONTEND_URL || 'https://www.involuntaryresponse.com';

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

router.get('/', async (req, res) => {
  try {
    const urls = [];

    urls.push({ loc: '/', changefreq: 'daily', priority: '1.0' });
    urls.push({ loc: '/explore', changefreq: 'daily', priority: '0.8' });
    urls.push({ loc: '/about', changefreq: 'monthly', priority: '0.6' });

    const posts = await db.all(
      `SELECT slug, updated_at, published_at FROM posts
       WHERE status = 'published'
       ORDER BY published_at DESC`
    );
    for (const p of posts) {
      urls.push({
        loc: `/posts/${p.slug}`,
        lastmod: (p.updated_at || p.published_at || '').slice(0, 10),
        changefreq: 'monthly',
        priority: '0.7',
      });
    }

    const tags = await db.all(
      `SELECT DISTINCT pt.tag FROM post_tags pt
       JOIN posts p ON pt.post_id = p.id
       WHERE p.status = 'published'`
    );
    for (const t of tags) {
      urls.push({
        loc: `/tag/${encodeURIComponent(t.tag)}`,
        changefreq: 'weekly',
        priority: '0.5',
      });
    }

    const artists = await db.all(
      `SELECT DISTINCT pa.artist_name FROM post_artists pa
       JOIN posts p ON pa.post_id = p.id
       WHERE p.status = 'published'`
    );
    for (const a of artists) {
      urls.push({
        loc: `/artist/${encodeURIComponent(a.artist_name)}`,
        changefreq: 'weekly',
        priority: '0.5',
      });
    }

    const categories = await db.all('SELECT slug FROM categories');
    for (const c of categories) {
      urls.push({
        loc: `/category/${c.slug}`,
        changefreq: 'weekly',
        priority: '0.5',
      });
    }

    const contributors = await db.all(
      `SELECT DISTINCT u.username FROM users u
       JOIN posts p ON u.id = p.author_id
       WHERE u.is_active = 1 AND p.status = 'published'`
    );
    for (const c of contributors) {
      urls.push({
        loc: `/u/${encodeURIComponent(c.username)}`,
        changefreq: 'weekly',
        priority: '0.4',
      });
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const u of urls) {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(SITE_URL + u.loc)}</loc>\n`;
      if (u.lastmod) xml += `    <lastmod>${escapeXml(u.lastmod)}</lastmod>\n`;
      if (u.changefreq) xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
      if (u.priority) xml += `    <priority>${u.priority}</priority>\n`;
      xml += '  </url>\n';
    }
    xml += '</urlset>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Failed to generate sitemap');
  }
});

export default router;
