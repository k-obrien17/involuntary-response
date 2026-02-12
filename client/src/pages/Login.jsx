import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/create');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="border-2 border-white p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-8 uppercase tracking-wide">SIGN IN</h1>

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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 font-bold uppercase hover:bg-gray-200 transition disabled:opacity-50"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <p className="text-gray-500 text-center mt-6 uppercase text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-white hover:text-gray-300 border-b border-white">
            CREATE ONE
          </Link>
        </p>

        <Link to="/" className="block text-center text-gray-600 mt-4 hover:text-white uppercase text-sm">
          BACK TO HOME
        </Link>
      </div>
    </div>
  );
}
