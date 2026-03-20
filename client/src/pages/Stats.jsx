import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analytics } from '../api/client';

export default function Stats() {
  const [posts, setPosts] = useState([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [artists, setArtists] = useState([]);
  const [activity, setActivity] = useState({ totalPosts: 0, postsThisMonth: 0, currentStreak: 0 });
  const [sort, setSort] = useState('likes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Fetch artists and activity once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [artistsRes, activityRes] = await Promise.all([
          analytics.myArtists(),
          analytics.myActivity(),
        ]);
        if (!cancelled) {
          setArtists(artistsRes.data.artists || []);
          setActivity(activityRes.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load stats.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch post stats when sort changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await analytics.myStats(sort);
        if (!cancelled) {
          setPosts(res.data.posts || []);
          setTotalLikes(res.data.totalLikes || 0);
          setTotalComments(res.data.totalComments || 0);
          if (!initialLoaded) {
            setLoading(false);
            setInitialLoaded(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load stats.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [sort]);

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

  const sortTabs = [
    { key: 'likes', label: 'Likes' },
    { key: 'comments', label: 'Comments' },
    { key: 'recent', label: 'Recent' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Stats</h1>

      {/* Activity summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{activity.totalPosts}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Posts</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{activity.postsThisMonth}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">This Month</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{activity.currentStreak}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Streak (days)</div>
        </div>
      </div>

      {/* Engagement totals */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
        Total likes: {totalLikes} &middot; Total comments: {totalComments}
      </p>

      {/* Post performance */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Post Performance</h2>

      <div className="flex gap-4 mb-4">
        {sortTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSort(tab.key)}
            className={
              sort === tab.key
                ? 'text-sm text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100 pb-1'
                : 'text-sm text-gray-400 hover:text-gray-600 pb-1'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-400 text-sm">No published posts yet.</p>
      ) : (
        <div>
          {posts.map((post, idx) => (
            <div
              key={post.slug}
              className={`flex items-center justify-between py-3${idx < posts.length - 1 ? ' border-b border-gray-100 dark:border-gray-800' : ''}`}
            >
              <div>
                <Link
                  to={`/posts/${post.slug}`}
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline"
                >
                  {post.embedTitle || (post.body && post.body.length > 60 ? post.body.slice(0, 60) + '...' : post.body)}
                </Link>
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 shrink-0 ml-4">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                  {post.likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  {post.commentCount}
                </span>
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
