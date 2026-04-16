import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pages } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function About() {
  const { user } = useAuth();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pages.get('about')
      .then((res) => setPage(res.data))
      .catch(() => setPage({ title: 'About', body: '' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-gray-400 dark:text-gray-500 text-center">Loading...</p>
      </main>
    );
  }

  const paragraphs = (page?.body || '').split(/\n{2,}/).filter(Boolean);

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="space-y-12">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {page?.title || 'About'}
            </h1>
            {user?.role === 'admin' && (
              <Link
                to="/admin/pages/about"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
              >
                Edit
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Get involved
          </h2>
          <div className="mt-4 space-y-3 text-lg text-gray-700 dark:text-gray-300">
            <p>
              <Link
                to="/join"
                className="text-gray-900 dark:text-gray-100 underline underline-offset-4 hover:text-gray-500 dark:hover:text-gray-400 transition"
              >
                Join as a reader
              </Link>
              {' '}&mdash; get an account and start following along.
            </p>
            <p>
              <a
                href="/api/feed"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 dark:text-gray-100 underline underline-offset-4 hover:text-gray-500 dark:hover:text-gray-400 transition"
              >
                Subscribe via RSS
              </a>
              {' '}&mdash; new posts in your reader, no account needed.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
