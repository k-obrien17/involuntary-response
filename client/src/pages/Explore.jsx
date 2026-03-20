import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { browse } from '../api/client';

export default function Explore() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExplore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await browse.explore();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load explore:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExplore();
  }, [fetchExplore]);

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-400 dark:text-gray-500 text-center">Loading...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-400 dark:text-gray-500 mb-4">{error || 'Failed to load explore data.'}</p>
          <button
            onClick={fetchExplore}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Explore</h1>

      {data.tags && data.tags.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Popular Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.tags.map((item) => (
              <Link
                key={item.tag}
                to={`/tag/${item.tag}`}
                className="inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                #{item.tag}
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.artists && data.artists.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Artists</h2>
          <div className="space-y-3">
            {data.artists.map((artist) => (
              <Link
                key={artist.name}
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="flex items-center gap-3 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {artist.image ? (
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                )}
                <span className="text-base text-gray-900 dark:text-gray-100">
                  {artist.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.contributors && data.contributors.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Contributors
          </h2>
          <div className="space-y-2">
            {data.contributors.map((contributor) => (
              <div key={contributor.username}>
                <Link
                  to={`/u/${contributor.username}`}
                  className="text-base text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  {contributor.displayName}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
