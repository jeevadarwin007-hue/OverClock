import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'oled' | 'brutalism' | 'swiss';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const savedTheme = localStorage.getItem('campusops_theme');
      return savedTheme === 'brutalism' || savedTheme === 'swiss' ? savedTheme : 'oled';
    } catch {
      return 'oled';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.remove('theme-mocha', 'theme-monochrome', 'theme-oled', 'theme-brutalism', 'theme-swiss');
    root.classList.add(`theme-${theme}`);
    root.classList.toggle('dark', theme !== 'swiss');
    try {
      localStorage.setItem('campusops_theme', theme);
    } catch {
      // noop
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === 'oled' ? 'brutalism' : current === 'brutalism' ? 'swiss' : 'oled');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
