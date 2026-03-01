import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleAuthResponse = (res) => {
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await auth.login(email, password);
    return handleAuthResponse(res);
  };

  const register = async (email, password, displayName, token) => {
    const res = await auth.register(email, password, displayName, token);
    return handleAuthResponse(res);
  };

  const registerReader = async (email, password, displayName) => {
    const res = await auth.registerReader(email, password, displayName);
    return handleAuthResponse(res);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isContributor = user?.role === 'contributor' || user?.role === 'admin';
  const isReader = user?.role === 'reader';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, registerReader, logout,
      isContributor, isReader, isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
