import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { users } from '../../api/client';

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-800',
  contributor: 'bg-blue-100 text-blue-800',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Contributors() {
  const { user: currentUser } = useAuth();
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadContributors() {
    try {
      const res = await users.listContributors();
      setContributors(res.data);
    } catch (err) {
      setError('Failed to load contributors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContributors();
  }, []);

  async function handleDeactivate(id) {
    try {
      await users.deactivate(id);
      await loadContributors();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deactivate contributor');
    }
  }

  async function handleActivate(id) {
    try {
      await users.activate(id);
      await loadContributors();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to activate contributor');
    }
  }

  async function handlePromote(id, name) {
    const confirmed = window.confirm(
      `Promote ${name} to admin? This cannot be undone. The change takes effect on their next login.`
    );
    if (!confirmed) return;

    try {
      await users.promote(id);
      await loadContributors();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to promote contributor');
    }
  }

  const isSelf = (id) => currentUser && currentUser.id === id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Manage Contributors</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Contributors ({contributors.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Loading contributors...</div>
        ) : contributors.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">No contributors yet.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {contributors.map((c) => (
              <div key={c.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{c.displayName}</span>
                      <span className="text-sm text-gray-500">@{c.username}</span>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          ROLE_STYLES[c.role] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {c.role}
                      </span>
                      {!c.isActive && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          inactive
                        </span>
                      )}
                      {isSelf(c.id) && (
                        <span className="text-xs text-gray-400">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      <span>{c.email}</span>
                      <span className="mx-2">&middot;</span>
                      <span>Joined {formatDate(c.createdAt)}</span>
                    </div>
                  </div>

                  {!isSelf(c.id) && (
                    <div className="flex gap-2 shrink-0">
                      {c.isActive ? (
                        <button
                          onClick={() => handleDeactivate(c.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(c.id)}
                          className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-300 rounded-md hover:bg-green-50"
                        >
                          Activate
                        </button>
                      )}

                      {c.role === 'contributor' && (
                        <button
                          onClick={() => handlePromote(c.id, c.displayName)}
                          className="px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-300 rounded-md hover:bg-purple-50"
                        >
                          Promote to Admin
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
