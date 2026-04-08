import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSettings, saveSettings } from '@/lib/mock-data';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (t: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => getSettings().theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const s = getSettings();
    s.theme = theme;
    saveSettings(s);
  }, [theme]);

  const toggleTheme = () => setThemeState(t => t === 'light' ? 'dark' : 'light');
  const setTheme = (t: 'light' | 'dark') => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
