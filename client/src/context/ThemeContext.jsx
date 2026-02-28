import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

function getEffectiveTheme(stored) {
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(
    () => localStorage.getItem('theme') || 'system'
  );

  useEffect(() => {
    applyTheme(getEffectiveTheme(preference));
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(getEffectiveTheme('system'));
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [preference]);

  const setTheme = (value) => {
    if (value === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', value);
    }
    setPreference(value);
  };

  return (
    <ThemeContext.Provider value={{ preference, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
