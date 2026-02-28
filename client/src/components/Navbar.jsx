import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function ThemeToggle() {
  const { preference, setTheme } = useTheme();

  const cycle = () => {
    if (preference === 'system') setTheme('light');
    else if (preference === 'light') setTheme('dark');
    else setTheme('system');
  };

  const titles = { system: 'Theme: System', light: 'Theme: Light', dark: 'Theme: Dark' };

  return (
    <button
      onClick={cycle}
      title={titles[preference]}
      className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition p-1"
    >
      {preference === 'light' && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )}
      {preference === 'dark' && (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
      {preference === 'system' && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )}
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Involuntary Response
          </Link>
          <Link
            to="/explore"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Explore
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                to="/posts/new"
                className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                New post
              </Link>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  Admin
                </Link>
              )}
              <Link
                to={`/u/${user.username}`}
                className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition"
              >
                @{user.username}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
