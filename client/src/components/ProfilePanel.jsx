import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfilePanel } from '../context/ProfilePanelContext';
import { profile } from '../api/client';
import { relativeTime } from '../utils/formatDate';

export default function ProfilePanel() {
  const { username, closePanel } = useProfilePanel();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!username) {
      setProfileData(null);
      setPosts([]);
      return;
    }

    setLoading(true);
    profile
      .get(username)
      .then((res) => {
        setProfileData(res.data.user);
        setPosts(res.data.posts);
      })
      .catch(() => {
        setProfileData(null);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [username]);

  const open = !!username;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-1/2 max-w-2xl bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto px-8 py-8">
          <button
            onClick={closePanel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none cursor-pointer"
            aria-label="Close"
          >
            &times;
          </button>

          {loading && (
            <p className="text-gray-400 text-center mt-12">Loading...</p>
          )}

          {!loading && profileData && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  {profileData.displayName}
                </h2>
                <p className="text-sm text-gray-500">@{profileData.username}</p>
                {profileData.bio && (
                  <p className="text-gray-600 mt-3">{profileData.bio}</p>
                )}
                <Link
                  to={`/u/${profileData.username}`}
                  onClick={closePanel}
                  className="inline-block mt-3 text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  View full profile
                </Link>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Posts
                </h3>
                {posts.length === 0 ? (
                  <p className="text-gray-400">No posts yet.</p>
                ) : (
                  <div>
                    {posts.map((post) => (
                      <div
                        key={post.slug}
                        className="py-3 border-b border-gray-100 last:border-0"
                      >
                        <Link
                          to={`/posts/${post.slug}`}
                          onClick={closePanel}
                          className="text-base leading-snug text-gray-900 hover:text-gray-600 transition"
                        >
                          {post.body.length > 100
                            ? post.body.slice(0, 100) + '...'
                            : post.body}
                        </Link>
                        <div className="mt-1 text-sm text-gray-400">
                          {relativeTime(post.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !profileData && username && (
            <p className="text-gray-400 text-center mt-12">User not found.</p>
          )}
        </div>
      </div>
    </>
  );
}
