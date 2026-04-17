import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { browse } from '../api/client';
import PostCard from '../components/PostCard';
import useDocumentMeta from '../hooks/useDocumentMeta';

export default function CategoryBrowse() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  useDocumentMeta(category?.name || slug, category?.name ? `${category.name} — posts on Involuntary Response.` : undefined);
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    setCategory(null);

    const fetchPosts = async () => {
      try {
        const res = await browse.byCategory(slug);
        setCategory(res.data.category);
        setPosts(res.data.posts);
        setNextCursor(res.data.nextCursor);
      } catch (err) {
        console.error('Failed to load category posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [slug]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await browse.byCategory(slug, { cursor: nextCursor });
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
        <p className="text-gray-400 dark:text-gray-500 text-center">Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-10">
        {category?.icon && <span className="mr-2">{category.icon}</span>}
        {category?.name || slug}
      </h1>

      {posts.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500">No posts in this category yet.</p>
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
