import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { posts } from '../api/client';
import { useAuth } from '../context/AuthContext';
import EmbedPreview from '../components/EmbedPreview';
import RichBody from '../components/RichBody';
import Avatar from '../components/Avatar';
import LikeButton from '../components/LikeButton';
import CommentSection from '../components/CommentSection';
import { fullDate } from '../utils/formatDate';

export default function ViewPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

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
      {post.status === 'published' && user && user.id === post.authorId && (
        <div className="mb-6 flex justify-end">
          <Link
            to={`/edit/${post.slug}`}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
          >
            Edit
          </Link>
        </div>
      )}

      {post.status === 'draft' && user && user.id === post.authorId && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8 flex items-center justify-between">
          <div>
            <span className="text-amber-700 dark:text-amber-400 font-medium text-sm">Draft</span>
            <span className="text-amber-600 dark:text-amber-500 text-sm ml-2">Only you can see this post</span>
          </div>
          <button
            onClick={async () => {
              setPublishing(true);
              try {
                await posts.update(post.slug, {
                  body: post.body,
                  embedUrl: post.embed?.originalUrl || null,
                  tags: post.tags,
                  artistName: post.artists?.[0]?.name || null,
                  status: 'published',
                });
                const res = await posts.getBySlug(post.slug);
                setPost(res.data);
                setPublishing(false);
              } catch {
                setPublishing(false);
              }
            }}
            disabled={publishing}
            className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-4 py-2 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      )}

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

      <CommentSection
        postSlug={post.slug}
        initialComments={post.comments || []}
        postAuthorId={post.authorId}
      />

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
        <span>{fullDate(post.publishedAt || post.createdAt)}</span>
        {post.status === 'published' && post.updatedAt && post.publishedAt &&
          new Date(post.updatedAt) > new Date(post.publishedAt) && (
            <span className="text-gray-400 dark:text-gray-500"> (edited)</span>
        )}
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
