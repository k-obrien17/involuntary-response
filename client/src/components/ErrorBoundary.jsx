import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="max-w-2xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Something went wrong
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            An unexpected error occurred. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
          >
            Refresh
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
