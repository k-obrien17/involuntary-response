import { useState, useEffect } from 'react';
import { categories as categoriesApi } from '../../api/client';

export default function Categories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    categoriesApi.list()
      .then((res) => setItems(res.data.categories))
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      const res = await categoriesApi.create(name.trim());
      setItems([...items, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? Posts using it will become uncategorized.')) return;
    try {
      await categoriesApi.remove(id);
      setItems(items.filter((c) => c.id !== id));
    } catch {
      setError('Failed to delete category');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Manage Categories</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-3 mb-8">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          maxLength={100}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400"
        />
        <button
          type="submit"
          className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-6 py-2 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500">No categories yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
              <span className="text-gray-900 dark:text-gray-100 font-medium">{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
