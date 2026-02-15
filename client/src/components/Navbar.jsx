import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/discover', label: 'DISCOVER' },
    { path: '/leaderboard', label: 'LEADERBOARD' },
    { path: '/create', label: 'CREATE' },
    ...(user ? [
      { path: '/my-lineups', label: 'MY LINEUPS' },
    ] : []),
  ];

  return (
    <nav className="bg-black border-b-2 border-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold text-white uppercase tracking-wider">
            BACKYARD MARQUEE
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition uppercase tracking-wide ${isActive(link.path) ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-white'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <span className="text-gray-500 text-sm uppercase">@{user.username}</span>
                <button
                  onClick={logout}
                  className="text-gray-500 hover:text-white transition text-sm uppercase"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="border-2 border-white px-4 py-2 text-sm font-bold uppercase hover:bg-white hover:text-black transition"
                >
                  SIGN IN
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-black px-4 py-2 text-sm font-bold uppercase hover:bg-gray-200 transition"
                >
                  SIGN UP
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-white py-4 space-y-2">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2 uppercase tracking-wide ${
                  isActive(link.path)
                    ? 'bg-white text-black'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t-2 border-white pt-4 mt-4 px-4">
              {user ? (
                <div className="space-y-2">
                  <p className="text-gray-500 text-sm uppercase">@{user.username}</p>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="text-gray-500 hover:text-white transition text-sm uppercase"
                  >
                    LOGOUT
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block border-2 border-white px-4 py-2 text-sm font-bold uppercase hover:bg-white hover:text-black transition text-center"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block bg-white text-black px-4 py-2 text-sm font-bold uppercase hover:bg-gray-200 transition text-center"
                  >
                    SIGN UP
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
