import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">Manage your invite-only community.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          to="/admin/invites"
          className="block p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage Invites</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create invite links, view invite history, and revoke unused invites.
          </p>
        </Link>

        <Link
          to="/admin/contributors"
          className="block p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage Contributors</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View all contributors, deactivate accounts, and manage roles.
          </p>
        </Link>

        <Link
          to="/admin/stats"
          className="block p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Site Stats</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View site-wide analytics: posts, engagement, top contributors, and top artists.
          </p>
        </Link>

        <Link
          to="/admin/pages"
          className="block p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Site Pages</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Edit static page content (About, etc.) without touching code.
          </p>
        </Link>
      </div>
    </div>
  );
}
