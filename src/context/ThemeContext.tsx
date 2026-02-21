import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';
type ViewMode = 'table' | 'cards';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  defaultView: ViewMode;
  setDefaultView: (v: ViewMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('breakthru_theme');
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
  });

  const [defaultView, setDefaultViewState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('breakthru_view');
    return (stored === 'table' || stored === 'cards') ? stored : 'table';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('breakthru_theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState(prev => prev === 'dark' ? 'light' : 'dark');

  const setDefaultView = (v: ViewMode) => {
    setDefaultViewState(v);
    localStorage.setItem('breakthru_view', v);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, defaultView, setDefaultView }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
