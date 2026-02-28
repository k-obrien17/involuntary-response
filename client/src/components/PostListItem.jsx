import { Link, useNavigate } from 'react-router-dom';
import { relativeTime } from '../utils/formatDate';

export default function PostListItem({ post }) {
  const navigate = useNavigate();
  const preview =
    post.body.length > 100 ? post.body.slice(0, 100) + '...' : post.body;

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <Link
        to={`/posts/${post.slug}`}
        className="text-base leading-snug text-gray-900 hover:text-gray-600 transition"
      >
        {preview}
      </Link>
      <div className="mt-1 text-sm text-gray-400">
        <button
          onClick={() => navigate(`/u/${post.author.username}`)}
          className="hover:text-gray-600 transition cursor-pointer"
        >
          {post.author.displayName}
        </button>
        <span className="mx-1">&middot;</span>
        <span>{relativeTime(post.createdAt)}</span>
      </div>
    </div>
  );
}
