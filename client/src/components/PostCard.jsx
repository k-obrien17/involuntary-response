import { Link } from 'react-router-dom';
import EmbedPlaceholder from './EmbedPlaceholder';
import { relativeTime } from '../utils/formatDate';

export default function PostCard({ post }) {
  return (
    <article>
      <div className="prose prose-lg lg:prose-xl prose-gray max-w-none">
        <p className="whitespace-pre-wrap">{post.body}</p>
      </div>

      {post.embed && (
        <div className="mt-6">
          <EmbedPlaceholder embed={post.embed} />
        </div>
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {post.tags.map((tag) => (
            <span key={tag} className="text-sm text-gray-500">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-400">
        <Link
          to={`/posts/${post.slug}`}
          className="hover:text-gray-600 transition"
        >
          {relativeTime(post.createdAt)}
        </Link>
        <span className="mx-2">&middot;</span>
        <span>{post.author.displayName}</span>
      </div>
    </article>
  );
}
