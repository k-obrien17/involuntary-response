import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(username, email, password);
      navigate('/create');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="border-2 border-white p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-8 uppercase tracking-wide">SIGN UP</h1>

        {error && (
          <div className="border-2 border-white text-white px-4 py-3 mb-6 uppercase text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-black border-2 border-white text-white px-4 py-3 uppercase text-sm placeholder-gray-600 focus:outline-none"
            required
          />
          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black border-2 border-white text-white px-4 py-3 uppercase text-sm placeholder-gray-600 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="PASSWORD (MIN 6 CHARACTERS)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border-2 border-white text-white px-4 py-3 uppercase text-sm placeholder-gray-600 focus:outline-none"
            required
            minLength={6}
          />
          <button
            type="submit"
            className="w-full border-2 border-white px-4 py-3 text-sm font-bold uppercase hover:bg-white hover:text-black transition"
          >
            CREATE ACCOUNT
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6 uppercase text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:underline">SIGN IN</Link>
        </p>

        <Link to="/" className="block text-center text-gray-600 mt-4 hover:text-white uppercase text-sm">
          BACK TO HOME
        </Link>
      </div>
    </div>
  );
}
