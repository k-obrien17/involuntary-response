import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { search as searchApi } from '../api/client';
import PostCard from '../components/PostCard';

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!q) {
      setPosts([]);
      setNextCursor(null);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setPosts([]);
      setNextCursor(null);
      try {
        const res = await searchApi.query(q);
        setPosts(res.data.posts);
        setNextCursor(res.data.nextCursor);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [q]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await searchApi.query(q, { cursor: nextCursor });
      setPosts((prev) => [...prev, ...res.data.posts]);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!q) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-400 dark:text-gray-500 text-center text-lg">
          Enter a search term to find posts.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-400 dark:text-gray-500 text-center">Searching...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-8">
        Search results for &ldquo;{q}&rdquo;
      </h1>

      {posts.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-center text-lg">
          No results for &ldquo;{q}&rdquo;
        </p>
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
            {loadingMore ? 'Loading...' : 'More results'}
          </button>
        </div>
      )}
    </main>
  );
}
