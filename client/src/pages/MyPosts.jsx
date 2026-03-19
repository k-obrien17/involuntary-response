import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { posts } from '../api/client';
import { relativeTime } from '../utils/formatDate';

export default function MyPosts() {
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await posts.listMine();
        setAllPosts(res.data.posts || []);
      } catch {
        setError('Failed to load your posts');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-400 dark:text-gray-500">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const drafts = allPosts.filter((p) => p.status === 'draft');
  const scheduled = allPosts.filter((p) => p.status === 'scheduled');
  const published = allPosts.filter((p) => p.status === 'published');

  if (allPosts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">My Posts</h1>
        <p className="text-gray-500 dark:text-gray-400">
          No posts yet.{' '}
          <Link to="/posts/new" className="text-gray-900 dark:text-gray-100 underline">
            Write your first take!
          </Link>
        </p>
      </div>
    );
  }

  const isEdited = (post) =>
    post.updatedAt &&
    post.publishedAt &&
    new Date(post.updatedAt) > new Date(post.publishedAt);

  const truncate = (text, max = 120) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">My Posts</h1>

      {drafts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Drafts
          </h2>
          <div className="space-y-3">
            {drafts.map((post) => (
              <Link
                key={post.id}
                to={`/posts/${post.slug}/edit`}
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition"
              >
                <p className="text-gray-900 dark:text-gray-100 text-sm">
                  {truncate(post.body)}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Draft</span>
                  <span>&middot;</span>
                  <span>{relativeTime(post.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Scheduled
          </h2>
          <div className="space-y-3">
            {scheduled.map((post) => (
              <Link
                key={post.id}
                to={`/posts/${post.slug}/edit`}
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition"
              >
                <p className="text-gray-900 dark:text-gray-100 text-sm">
                  {truncate(post.body)}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Scheduled</span>
                  <span>&middot;</span>
                  <span>{new Date(post.scheduledAt).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {published.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Published
          </h2>
          <div className="space-y-3">
            {published.map((post) => (
              <Link
                key={post.id}
                to={`/posts/${post.slug}`}
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition"
              >
                <p className="text-gray-900 dark:text-gray-100 text-sm">
                  {truncate(post.body)}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{relativeTime(post.publishedAt)}</span>
                  {isEdited(post) && (
                    <>
                      <span>&middot;</span>
                      <span className="text-gray-400 dark:text-gray-500">(edited)</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
