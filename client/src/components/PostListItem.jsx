import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { relativeTime } from '../utils/formatDate';
export default function PostListItem({ post }) {
  const preview =
    post.body.length > 100 ? post.body.slice(0, 100) + '...' : post.body;

  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Link
        to={`/posts/${post.slug}`}
        className="text-base leading-snug text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition"
      >
        {preview}
      </Link>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
        <Avatar
          emailHash={post.author?.emailHash}
          displayName={post.author?.displayName || 'Unknown'}
          size={18}
        />
        <Link
          to={`/u/${post.author?.username}`}
          className="hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          {post.author?.displayName || 'Unknown'}
        </Link>
        <span>&middot;</span>
        <span>{relativeTime(post.createdAt)}</span>
        {post.likeCount > 0 && (
          <>
            <span>&middot;</span>
            <span>{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</span>
          </>
        )}
      </div>
    </div>
  );
}
