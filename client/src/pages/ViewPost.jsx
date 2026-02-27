import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { posts } from '../api/client';
import { useAuth } from '../context/AuthContext';
import EmbedPreview from '../components/EmbedPreview';

export default function ViewPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await posts.getBySlug(slug);
        setPost(res.data);
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <p className="text-lg leading-relaxed whitespace-pre-wrap">{post.body}</p>

      {post.embed && (
        <div className="mt-6">
          <EmbedPreview embed={post.embed} />
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        <span>By {post.author?.displayName || 'Unknown'}</span>
        <span className="mx-2">&middot;</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>

      {user && user.id === post.authorId && (
        <Link
          to={`/posts/${slug}/edit`}
          className="inline-block mt-4 text-sm text-gray-600 hover:text-gray-900"
        >
          Edit
        </Link>
      )}
    </div>
  );
}
