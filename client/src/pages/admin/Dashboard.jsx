import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-2 text-gray-500">Manage your invite-only community.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          to="/admin/invites"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900">Manage Invites</h2>
          <p className="mt-2 text-sm text-gray-500">
            Create invite links, view invite history, and revoke unused invites.
          </p>
        </Link>

        <Link
          to="/admin/contributors"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900">Manage Contributors</h2>
          <p className="mt-2 text-sm text-gray-500">
            View all contributors, deactivate accounts, and manage roles.
          </p>
        </Link>
      </div>
    </div>
  );
}
