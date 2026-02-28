import { Link } from 'react-router-dom';
import EmbedPlaceholder from './EmbedPlaceholder';
import { relativeTime } from '../utils/formatDate';
export default function PostCard({ post }) {
  return (
    <article>
      <div className="prose prose-lg lg:prose-xl prose-gray dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap">{post.body}</p>
      </div>

      {post.embed && (
        <div className="mt-6">
          <EmbedPlaceholder embed={post.embed} />
          {post.artists && post.artists.length > 0 && (
            <div className="mt-1 text-sm text-gray-400 dark:text-gray-500">
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
        </div>
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={`/tag/${tag}`}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-400 dark:text-gray-500">
        <Link
          to={`/posts/${post.slug}`}
          className="hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          {relativeTime(post.createdAt)}
        </Link>
        <span className="mx-2">&middot;</span>
        <Link
          to={`/u/${post.author.username}`}
          className="hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          {post.author.displayName}
        </Link>
      </div>
    </article>
  );
}
