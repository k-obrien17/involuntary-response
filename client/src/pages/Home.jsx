import { useState, useEffect } from 'react';
import { posts as postsApi } from '../api/client';
import PostCard from '../components/PostCard';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await postsApi.list();
        setPosts(res.data.posts);
        setNextCursor(res.data.nextCursor);
      } catch (err) {
        console.error('Failed to load feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await postsApi.list({ cursor: nextCursor });
      setPosts((prev) => [...prev, ...res.data.posts]);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-400 dark:text-gray-500 text-center">Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {posts.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-center text-lg">Nothing here yet.</p>
      ) : (
        <div className="space-y-16">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="mt-16 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition"
          >
            {loadingMore ? 'Loading...' : 'Older posts'}
          </button>
        </div>
      )}
    </main>
  );
}
