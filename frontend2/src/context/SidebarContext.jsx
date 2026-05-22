import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_EXPANDED = 'sidebar-expanded';
const STORAGE_THEME = 'app-theme';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_EXPANDED) === 'true';
    } catch {
      return false;
    }
  });
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_THEME) || 'dark';
    } catch {
      return 'dark';
    }
  });

  /** Pinned open/closed only — hover no longer resizes layout (smoother toggle). */
  const isWide = expanded;

  const toggleExpanded = useCallback(() => {
    setHoverExpanded(false);
    setExpanded((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_EXPANDED, String(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_THEME, next);
      } catch (_) {}
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      expanded,
      hoverExpanded,
      isWide,
      mobileOpen,
      theme,
      setHoverExpanded,
      toggleExpanded,
      toggleTheme,
      openMobile,
      closeMobile,
      setMobileOpen,
    }),
    [expanded, hoverExpanded, isWide, mobileOpen, theme, toggleExpanded, toggleTheme, openMobile, closeMobile],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
