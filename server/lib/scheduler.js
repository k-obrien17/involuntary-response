import db from '../db/index.js';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

async function publishDuePosts() {
  try {
    const now = new Date().toISOString();

    // Find all posts whose scheduled time has arrived
    const duePosts = await db.all(
      "SELECT id, slug FROM posts WHERE status = 'scheduled' AND scheduled_at <= ?",
      now
    );

    if (duePosts.length === 0) return;

    for (const post of duePosts) {
      try {
        await db.run(
          "UPDATE posts SET status = 'published', published_at = CURRENT_TIMESTAMP, scheduled_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          post.id
        );
        console.log(`Scheduler: published post ${post.slug} (id=${post.id})`);
      } catch (err) {
        // Log but don't throw — other posts should still be processed
        console.error(`Scheduler: failed to publish post ${post.slug} (id=${post.id}):`, err.message);
      }
    }

    console.log(`Scheduler: published ${duePosts.length} scheduled post(s)`);
  } catch (err) {
    // Log but don't throw — the interval must continue running
    console.error('Scheduler: error checking for due posts:', err.message);
  }
}

export function startScheduler() {
  // Run once immediately on startup (catches any posts that were due while server was down)
  publishDuePosts();

  // Then run periodically
  setInterval(publishDuePosts, POLL_INTERVAL_MS);
  console.log(`Scheduler: started (polling every ${POLL_INTERVAL_MS / 1000}s)`);
}
