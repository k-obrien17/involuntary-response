import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAnalytics } from '../../api/client';

export default function AdminStats() {
  const [overview, setOverview] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalContributors: 0,
    totalReaders: 0,
  });
  const [contributors, setContributors] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [overviewRes, contributorsRes, artistsRes] = await Promise.all([
          adminAnalytics.overview(),
          adminAnalytics.contributors(),
          adminAnalytics.artists(),
        ]);
        if (!cancelled) {
          setOverview(overviewRes.data);
          setContributors(contributorsRes.data.contributors || []);
          setArtists(artistsRes.data.artists || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load admin stats.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  const overviewCards = [
    { label: 'Total Posts', value: overview.totalPosts },
    { label: 'Total Likes', value: overview.totalLikes },
    { label: 'Total Comments', value: overview.totalComments },
    { label: 'Contributors', value: overview.totalContributors },
    { label: 'Readers', value: overview.totalReaders },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to="/admin"
        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-4 inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Admin
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Site Stats</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {overviewCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center"
          >
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Top Contributors */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Contributors</h2>

      {contributors.length === 0 ? (
        <p className="text-gray-400 text-sm mb-8">No contributors yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 mb-8">
          {contributors.map((c, idx) => (
            <div key={c.username} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-6 text-right">{idx + 1}</span>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{c.displayName}</span>
                  <span className="text-sm text-gray-400 ml-2">@{c.username}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{c.postCount} posts</span>
                <span>{c.totalLikes} likes</span>
                <span>{c.totalComments} comments</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Artists */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4">Top Artists</h2>

      {artists.length === 0 ? (
        <p className="text-gray-400 text-sm">No artists tagged yet.</p>
      ) : (
        <div>
          {artists.map((artist) => (
            <div key={artist.name} className="flex items-center gap-3 py-2">
              {artist.image ? (
                <img src={artist.image} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
              )}
              <Link
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="text-sm text-gray-900 dark:text-gray-100 hover:underline flex-1"
              >
                {artist.name}
              </Link>
              <span className="text-sm text-gray-400">{artist.postCount} {artist.postCount === 1 ? 'post' : 'posts'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
