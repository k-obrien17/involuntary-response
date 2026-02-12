import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(username, password, email || undefined);
      navigate('/create');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="border-2 border-white p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-8 uppercase tracking-wide">CREATE ACCOUNT</h1>

        {error && (
          <div className="border-2 border-white text-white px-4 py-3 mb-6 uppercase text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-500 mb-2 uppercase text-sm">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-gray-600 focus:outline-none uppercase"
              placeholder="YOUR_USERNAME"
              required
            />
            <p className="text-gray-600 text-xs mt-1 uppercase">Letters, numbers, and underscores only</p>
          </div>

          <div>
            <label className="block text-gray-500 mb-2 uppercase text-sm">EMAIL <span className="text-gray-600">(OPTIONAL)</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-gray-600 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-gray-500 mb-2 uppercase text-sm">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-gray-600 focus:outline-none"
              placeholder="********"
              required
            />
          </div>

          <div>
            <label className="block text-gray-500 mb-2 uppercase text-sm">CONFIRM PASSWORD</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-gray-600 focus:outline-none"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 font-bold uppercase hover:bg-gray-200 transition disabled:opacity-50"
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-gray-500 text-center mt-6 uppercase text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:text-gray-300 border-b border-white">
            SIGN IN
          </Link>
        </p>

        <Link to="/" className="block text-center text-gray-600 mt-4 hover:text-white uppercase text-sm">
          BACK TO HOME
        </Link>
      </div>
    </div>
  );
}
