'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>('dark');

  // Only allow light theme on scorer pages
  const isScorerPage = pathname.startsWith('/scorer') || pathname.startsWith('/pwa-scorer');

  useEffect(() => {
    if (!isScorerPage && theme === 'light') {
      setTheme('dark');
      return;
    }

    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && (isScorerPage || savedTheme === 'dark')) {
      setTheme(savedTheme);
    } else if (isScorerPage && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, [isScorerPage]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    if (!isScorerPage) return; // Prevent toggle on non-scorer pages
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
