import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {user ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Welcome, {user.displayName}
            </h1>
            <p className="text-gray-500 text-lg">
              Short-form music takes from people who care about music.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Involuntary Response
            </h1>
            <p className="text-gray-500 text-lg mb-8">
              Short-form music takes from people who care about music.
            </p>
            <Link
              to="/login"
              className="inline-block bg-gray-900 text-white px-6 py-3 text-sm font-medium rounded hover:bg-gray-800 transition"
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
