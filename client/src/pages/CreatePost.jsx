import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PostForm from '../components/PostForm';
import { posts } from '../api/client';

export default function CreatePost() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async ({ body, embedUrl, tags }) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await posts.create({ body, embedUrl, tags });
      navigate(`/posts/${res.data.slug}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Write a take</h1>
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      <PostForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
