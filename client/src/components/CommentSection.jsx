import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { posts } from '../api/client';
import Avatar from './Avatar';
import { relativeTime } from '../utils/formatDate';

export default function CommentSection({ postSlug, initialComments, postAuthorId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments || []);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !body.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await posts.addComment(postSlug, body.trim());
      setComments([...comments, res.data]);
      setBody('');
    } catch {
      setError('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    const prev = comments;
    setComments(comments.filter((c) => c.id !== commentId));

    try {
      await posts.deleteComment(postSlug, commentId);
    } catch {
      setComments(prev);
    }
  };

  return (
    <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-6">
        {comments.length === 0
          ? 'No comments yet'
          : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
      </h3>

      <div>
        {comments.map((comment) => (
          <div key={comment.id} className="mb-6">
            <div className="flex items-center gap-2">
              <Avatar
                emailHash={comment.author.emailHash}
                displayName={comment.author.displayName}
                size={24}
              />
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                {comment.author.displayName}
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {relativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {comment.body}
            </p>
            {comment.canDelete && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="mt-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition min-h-[44px] min-w-[44px] flex items-center"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mt-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="Leave a comment..."
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:outline-none resize-none"
          />
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            {body.length > 0 ? (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {body.length}/500
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 transition min-h-[44px]"
            >
              Post
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
          <Link
            to="/join"
            className="underline hover:text-gray-600 dark:hover:text-gray-300 min-h-[44px] inline-flex items-center"
          >
            Log in
          </Link>{' '}
          to leave a comment
        </p>
      )}
    </div>
  );
}
