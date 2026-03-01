import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { posts } from '../api/client';

export default function LikeButton({ postSlug, initialCount, initialLiked }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const togglingRef = useRef(false);

  const handleToggle = async () => {
    if (!user) {
      navigate('/join');
      return;
    }

    if (togglingRef.current) return;
    togglingRef.current = true;

    const prevLiked = liked;
    const prevCount = count;

    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    try {
      const res = await posts.like(postSlug);
      setLiked(res.data.liked);
      setCount(res.data.likeCount);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      togglingRef.current = false;
    }
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={liked ? 'Unlike' : 'Like'}
      className="flex items-center gap-1 text-sm transition group"
    >
      {liked ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-red-500"
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-red-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      )}
      {count > 0 && (
        <span className="text-gray-500 dark:text-gray-400">{count}</span>
      )}
    </button>
  );
}
