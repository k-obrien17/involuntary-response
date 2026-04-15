import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-8">
          Reset your password
        </h1>

        {sent ? (
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              If an account exists with that email, a reset link has been sent.
            </p>
            <Link
              to="/login"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline text-sm"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 py-2 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              <Link to="/login" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
