import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profile } from '../api/client';
import Avatar from '../components/Avatar';
import PostListItem from '../components/PostListItem';
import useDocumentMeta from '../hooks/useDocumentMeta';

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useDocumentMeta(profileData?.displayName || username, profileData?.bio || `Profile of ${username} on Involuntary Response.`);
  const isOwnProfile = user?.username === username;

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setProfileData(null);
    setPosts([]);
    setNextCursor(null);
    setEditing(false);

    const fetchProfile = async () => {
      try {
        const res = await profile.get(username);
        setProfileData(res.data.user);
        setPosts(res.data.posts);
        setNextCursor(res.data.nextCursor);
        setBio(res.data.user.bio || '');
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          console.error('Failed to load profile:', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await profile.updateBio(bio);
      setProfileData((prev) => ({ ...prev, bio: res.data.bio }));
      setEditing(false);
    } catch (err) {
      console.error('Failed to update bio:', err);
    } finally {
      setSaving(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await profile.get(username, { cursor: nextCursor });
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

  if (notFound) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-400 dark:text-gray-500 text-center">User not found.</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Avatar
            emailHash={profileData.emailHash}
            displayName={profileData.displayName}
            size={64}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {profileData.displayName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{profileData.username}</p>
          </div>
        </div>

        <div className="mt-4">
          {isOwnProfile ? (
            editing ? (
              <div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  autoFocus
                  className="w-full border border-gray-200 dark:border-gray-600 rounded p-2 text-base bg-white dark:bg-gray-800 dark:text-gray-100 resize-none"
                  rows={3}
                  placeholder="Write a short bio..."
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {bio.length}/300
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditing(false);
                        setBio(profileData.bio || '');
                      }}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-3 py-1 rounded text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-300">
                  {profileData.bio || 'No bio yet.'}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-1"
                >
                  Edit bio
                </button>
              </div>
            )
          ) : (
            <p className="text-gray-600 dark:text-gray-300">
              {profileData.bio || 'No bio yet.'}
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Posts</h2>
        {posts.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500">No posts yet.</p>
        ) : (
          <div>
            {posts.map((post) => (
              <PostListItem key={post.slug} post={post} />
            ))}
            {nextCursor && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition"
                >
                  {loadingMore ? 'Loading...' : 'Older posts'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
