import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { browse } from '../api/client';
import PostListItem from '../components/PostListItem';

export default function TagBrowse() {
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);

    const fetchPosts = async () => {
      try {
        const res = await browse.byTag(tag);
        setPosts(res.data.posts);
        setNextCursor(res.data.nextCursor);
      } catch (err) {
        console.error('Failed to load tag posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [tag]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await browse.byTag(tag, { cursor: nextCursor });
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
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-400 text-center">Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">#{tag}</h1>

      {posts.length === 0 ? (
        <p className="text-gray-400">No posts tagged #{tag} yet.</p>
      ) : (
        <div>
          {posts.map((post) => (
            <PostListItem key={post.slug} post={post} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-gray-500 hover:text-gray-900 text-sm transition"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </main>
  );
}
