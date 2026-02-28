import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PostForm from '../components/PostForm';
import { posts } from '../api/client';

export default function CreatePost() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async ({ body, embedUrl, tags, artistName }) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await posts.create({ body, embedUrl, tags, artistName });
      navigate(`/posts/${res.data.slug}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Write a take</h1>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded mb-4">
          {error}
        </div>
      )}
      <PostForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
