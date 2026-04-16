import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pages } from '../../api/client';

export default function Pages() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    pages.list()
      .then((res) => setList(res.data.pages))
      .catch(() => setError('Failed to load pages'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Site pages</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        Edit the static content shown on public pages.
      </p>

      {error && (
        <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-gray-400 dark:text-gray-500">Loading...</p>
      ) : (
        <ul className="mt-8 space-y-2">
          {list.map((p) => (
            <li key={p.slug}>
              <Link
                to={`/admin/pages/${p.slug}`}
                className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{p.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                  /{p.slug} &middot; updated {new Date(p.updated_at).toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
