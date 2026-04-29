import { useState, useEffect, createContext, useContext } from 'react';

type Theme = 'dark' | 'light' | 'high-contrast' | 'soft';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: typeof themeConfig;
}

const themeConfig = {
  dark: {
    name: 'Dark',
    background: '#0a0a0f',
    surface: '#12121a',
    border: '#1e293b',
    primary: '#00d4ff',
    text: '#f8fafc',
    textMuted: '#94a3b8',
  },
  light: {
    name: 'Light',
    background: '#ffffff',
    surface: '#f8fafc',
    border: '#e2e8f0',
    primary: '#0891b2',
    text: '#0f172a',
    textMuted: '#64748b',
  },
  'high-contrast': {
    name: 'High Contrast',
    background: '#000000',
    surface: '#1a1a1a',
    border: '#ffffff',
    primary: '#00ffff',
    text: '#ffffff',
    textMuted: '#cccccc',
  },
  soft: {
    name: 'Soft',
    background: '#f0f4f8',
    surface: '#ffffff',
    border: '#d4e2f0',
    primary: '#6366f1',
    text: '#1e293b',
    textMuted: '#64748b',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('codecraft-theme') as Theme;
    if (saved && themeConfig[saved]) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    const config = themeConfig[theme];
    document.documentElement.style.setProperty('--background', config.background);
    document.documentElement.style.setProperty('--surface', config.surface);
    document.documentElement.style.setProperty('--border', config.border);
    document.documentElement.style.setProperty('--primary', config.primary);
    document.documentElement.style.setProperty('--text', config.text);
    document.documentElement.style.setProperty('--text-muted', config.textMuted);
    localStorage.setItem('codecraft-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themeConfig };
export type { Theme };