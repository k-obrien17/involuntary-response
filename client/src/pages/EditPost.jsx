import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PostForm from '../components/PostForm';
import { posts } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function EditPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [post, setPost] = useState(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (loading) return;
    const fetchPost = async () => {
      try {
        const res = await posts.getBySlug(slug);
        const data = res.data;
        if (user && data.authorId !== user.id) {
          navigate(`/posts/${slug}`);
          return;
        }
        setPost(data);
      } catch {
        navigate('/');
      } finally {
        setLoadingPost(false);
      }
    };
    fetchPost();
  }, [slug, user, loading, navigate]);

  const handleSubmit = async ({ body, embedUrl, tags, artistName }) => {
    setSubmitting(true);
    setError(null);
    try {
      const updateData = { body, embedUrl, tags, artistName };
      if (post.status === 'draft') {
        updateData.status = 'published';
      }
      await posts.update(slug, updateData);
      navigate(`/posts/${slug}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update post');
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async ({ body, embedUrl, tags, artistName }) => {
    setSubmitting(true);
    setError(null);
    try {
      await posts.update(slug, { body, embedUrl, tags, artistName });
      navigate(`/posts/${slug}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save draft');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await posts.delete(slug);
      navigate('/');
    } catch {
      setError('Failed to delete post. Please try again.');
      setDeleting(false);
    }
  };

  if (loading || loadingPost) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {post.status === 'draft' ? 'Edit draft' : 'Edit post'}
      </h1>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded mb-4">
          {error}
        </div>
      )}
      <PostForm
        initialData={{
          body: post.body,
          embed: post.embed,
          tags: post.tags,
          artistName: post.artists?.[0]?.name || '',
        }}
        onSubmit={handleSubmit}
        onSaveDraft={post.status === 'draft' ? handleSaveDraft : undefined}
        submitting={submitting}
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-red-600 hover:text-red-800 text-sm mt-8"
      >
        {deleting ? 'Deleting...' : 'Delete post'}
      </button>
    </div>
  );
}
