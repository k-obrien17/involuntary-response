import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { posts } from '../api/client';
import { useAuth } from '../context/AuthContext';
import EmbedPreview from '../components/EmbedPreview';
import { fullDate } from '../utils/formatDate';

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
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-400 text-center">Loading...</p>
      </main>
    );
  }

  if (!post) return null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <article className="prose prose-lg md:prose-xl lg:prose-2xl prose-gray max-w-none">
        <p className="whitespace-pre-wrap leading-relaxed">{post.body}</p>
      </article>

      {post.embed && (
        <div className="mt-8">
          <EmbedPreview embed={post.embed} />
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {post.tags.map((tag) => (
            <span key={tag} className="text-sm text-gray-500">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-400">
        <span>{post.author?.displayName || 'Unknown'}</span>
        <span className="mx-2">&middot;</span>
        <span>{fullDate(post.createdAt)}</span>
      </div>

      {user && user.id === post.authorId && (
        <Link
          to={`/posts/${slug}/edit`}
          className="inline-block mt-4 text-sm text-gray-500 hover:text-gray-900 transition"
        >
          Edit
        </Link>
      )}
    </main>
  );
}
