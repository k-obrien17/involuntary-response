import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { posts } from '../api/client';
import { useAuth } from '../context/AuthContext';
import EmbedPreview from '../components/EmbedPreview';
import RichBody from '../components/RichBody';
import Avatar from '../components/Avatar';
import LikeButton from '../components/LikeButton';
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
        <p className="text-gray-400 dark:text-gray-500 text-center">Loading...</p>
      </main>
    );
  }

  if (!post) return null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <article className="prose prose-lg md:prose-xl lg:prose-2xl prose-gray dark:prose-invert max-w-none">
        <RichBody text={post.body} className="leading-relaxed" />
      </article>

      {post.embed && (
        <div className="mt-8">
          <EmbedPreview embed={post.embed} />
        </div>
      )}

      {post.artists && post.artists.length > 0 && (
        <div className="mt-2 text-sm text-gray-400 dark:text-gray-500">
          {post.artists.map((artist, i) => (
            <span key={artist.name}>
              {i > 0 && ', '}
              <Link
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {artist.name}
              </Link>
            </span>
          ))}
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={`/tag/${tag}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <LikeButton
          postSlug={post.slug}
          initialCount={post.likeCount}
          initialLiked={post.likedByUser}
        />
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Avatar
          emailHash={post.author?.emailHash}
          displayName={post.author?.displayName || 'Unknown'}
          size={28}
        />
        <Link
          to={`/u/${post.author?.username}`}
          className="hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          {post.author?.displayName || 'Unknown'}
        </Link>
        <span>&middot;</span>
        <span>{fullDate(post.createdAt)}</span>
      </div>

      {user && user.id === post.authorId && (
        <Link
          to={`/posts/${slug}/edit`}
          className="inline-block mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
        >
          Edit
        </Link>
      )}
    </main>
  );
}
