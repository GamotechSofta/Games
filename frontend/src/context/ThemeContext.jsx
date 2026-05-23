import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { isThemeTransitionRunning, runThemeTransition } from '../utils/themeTransition';

export const THEME_STORAGE_KEY = 'app-theme';

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function applyThemeToDocument(theme) {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${theme}`);
  root.style.colorScheme = theme;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : getStoredTheme();
      setThemeState(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next, options = {}) => {
    const target = next === 'light' ? 'light' : 'dark';
    if (target === theme || isThemeTransitionRunning()) return;

    const commit = () => setThemeState(target);

    if (options.origin) {
      runThemeTransition({
        currentTheme: theme,
        origin: options.origin,
        onThemeApply: () => {
          flushSync(() => {
            applyThemeToDocument(target);
            commit();
          });
          try {
            localStorage.setItem(THEME_STORAGE_KEY, target);
          } catch {
            /* ignore */
          }
        },
      });
      return;
    }

    commit();
  }, [theme]);

  const toggleTheme = useCallback(
    (options = {}) => {
      setTheme(theme === 'light' ? 'dark' : 'light', options);
    },
    [theme, setTheme],
  );

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
