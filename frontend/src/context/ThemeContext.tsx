import React, { createContext, useContext, useEffect } from 'react';

export type ThemeMode = 'oled';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: ThemeMode = 'oled';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'oled');
    root.classList.remove('theme-mocha', 'theme-monochrome');
    root.classList.add('theme-oled', 'dark');
    try {
      localStorage.setItem('campusops_theme', 'oled');
    } catch {
      // noop
    }
  }, []);

  const noop = () => {};

  return (
    <ThemeContext.Provider value={{ theme, setTheme: noop, toggleTheme: noop }}>
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
