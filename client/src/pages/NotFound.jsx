import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">404</h1>
        <p className="text-lg text-gray-400 dark:text-gray-500 mb-8">Page not found</p>
        <Link
          to="/"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
        >
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
