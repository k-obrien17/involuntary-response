import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lineups } from '../api/client';

export default function Comments({ lineupId }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    lineups.getComments(lineupId).then(res => setComments(res.data)).catch(() => {});
  }, [lineupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await lineups.addComment(lineupId, content.trim());
      setComments(prev => [...prev, res.data]);
      setContent('');
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await lineups.deleteComment(lineupId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      // silent
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold uppercase mb-4">
        COMMENTS {comments.length > 0 && `(${comments.length})`}
      </h3>

      {comments.length > 0 && (
        <div className="space-y-4 mb-6">
          {comments.map(comment => (
            <div key={comment.id} className="border border-white/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Link to={`/user/${comment.username}`} className="text-sm font-bold uppercase hover:text-gray-300">
                    @{comment.username}
                  </Link>
                  <span className="text-gray-600 text-xs">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                {user && user.id === comment.user_id && (
                  <button onClick={() => handleDelete(comment.id)} className="text-gray-600 hover:text-white text-xs uppercase">
                    DELETE
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              placeholder="ADD A COMMENT..."
              className="w-full px-4 py-3 bg-black border border-white/30 text-white placeholder-gray-600 focus:outline-none focus:border-white text-sm resize-none min-h-[80px] uppercase"
            />
            <span className="absolute bottom-2 right-3 text-gray-600 text-xs">{content.length}/500</span>
          </div>
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="mt-2 px-6 py-2 bg-white text-black font-bold uppercase text-sm hover:bg-gray-200 transition disabled:opacity-50"
          >
            {submitting ? 'POSTING...' : 'POST COMMENT'}
          </button>
        </form>
      ) : (
        <Link to="/login" className="text-gray-500 hover:text-white text-sm uppercase border-b border-gray-500 hover:border-white">
          SIGN IN TO COMMENT
        </Link>
      )}
    </div>
  );
}
