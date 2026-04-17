import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { browse } from '../api/client';
import PostListItem from '../components/PostListItem';
import useDocumentMeta from '../hooks/useDocumentMeta';

export default function ArtistPage() {
  const { name } = useParams();
  useDocumentMeta(name, `Music takes about ${name} on Involuntary Response.`);
  const [artist, setArtist] = useState(null);
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    setArtist(null);

    const fetchPosts = async () => {
      try {
        const res = await browse.byArtist(name);
        setArtist(res.data.artist);
        setPosts(res.data.posts);
        setNextCursor(res.data.nextCursor);
      } catch (err) {
        console.error('Failed to load artist posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [name]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await browse.byArtist(name, { cursor: nextCursor });
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
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-2">
        {artist?.image ? (
          <img
            src={artist.image}
            alt={name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{name}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {artist?.postCount || posts.length} {(artist?.postCount || posts.length) === 1 ? 'post' : 'posts'}
            {artist?.spotifyUrl && (
              <>
                {' '}&middot;{' '}
                <a
                  href={artist.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  Spotify
                </a>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="mb-6" />

      {posts.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500">No posts about {name} yet.</p>
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
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </main>
  );
}
