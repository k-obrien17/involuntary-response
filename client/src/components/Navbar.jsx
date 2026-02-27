import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          Involuntary Response
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Admin
                </Link>
              )}
              <span className="text-sm text-gray-500">{user.displayName}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
