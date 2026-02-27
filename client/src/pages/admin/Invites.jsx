import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invites } from '../../api/client';

const STATUS_STYLES = {
  pending: 'bg-green-100 text-green-800',
  used: 'bg-gray-100 text-gray-800',
  expired: 'bg-yellow-100 text-yellow-800',
  revoked: 'bg-red-100 text-red-800',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Invites() {
  const [inviteList, setInviteList] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState('');

  async function loadInvites() {
    try {
      const res = await invites.list();
      setInviteList(res.data);
    } catch (err) {
      setError('Failed to load invites');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvites();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setCreatedInvite(null);
    try {
      const res = await invites.create(note || null);
      setCreatedInvite(res.data);
      setNote('');
      await loadInvites();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    try {
      await invites.revoke(id);
      await loadInvites();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke invite');
    }
  }

  async function copyToClipboard(text, id) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Manage Invites</h1>
      </div>

      {/* Create invite form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Invite</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (e.g., who this is for)"
            maxLength={200}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? 'Generating...' : 'Generate Invite'}
          </button>
        </form>

        {createdInvite && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm font-medium text-green-800 mb-2">Invite created!</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-green-200 break-all">
                {createdInvite.inviteUrl}
              </code>
              <button
                onClick={() => copyToClipboard(createdInvite.inviteUrl, 'new')}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 whitespace-nowrap"
              >
                {copied === 'new' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Invite list */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Invites</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Loading invites...</div>
        ) : inviteList.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">No invites yet. Create one above.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {inviteList.map((inv) => (
              <div key={inv.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                      {inv.note && (
                        <span className="text-sm text-gray-700 truncate">{inv.note}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>Created by {inv.createdBy?.displayName || 'Unknown'} on {formatDate(inv.createdAt)}</p>
                      {inv.usedBy && (
                        <p>
                          Used by {inv.usedBy.displayName} (@{inv.usedBy.username}) on {formatDate(inv.usedAt)}
                        </p>
                      )}
                      {inv.revokedAt && <p>Revoked on {formatDate(inv.revokedAt)}</p>}
                    </div>
                  </div>

                  {inv.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => copyToClipboard(inv.inviteUrl, inv.id)}
                        className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {copied === inv.id ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                      >
                        Revoke
                      </button>
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
