import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [error, setError] = useState('');
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setError('');
        try {
          await googleLogin(response.credential);
          navigate('/create');
        } catch (err) {
          setError(err.response?.data?.error || 'Sign in failed');
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: 320,
      text: 'signin_with',
    });
  }, [googleLogin, navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="border-2 border-white p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-8 uppercase tracking-wide">SIGN IN</h1>

        {error && (
          <div className="border-2 border-white text-white px-4 py-3 mb-6 uppercase text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <div ref={buttonRef}></div>
        </div>

        <Link to="/" className="block text-center text-gray-600 mt-8 hover:text-white uppercase text-sm">
          BACK TO HOME
        </Link>
      </div>
    </div>
  );
}
