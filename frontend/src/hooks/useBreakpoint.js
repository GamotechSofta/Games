import { useState, useEffect } from 'react';

/**
 * Single source of truth for breakpoint. Matches Tailwind md (768px).
 * Use for behavior that differs by viewport (e.g. back button, navigate vs setState).
 * @returns {{ isDesktop: boolean }} isDesktop true when viewport >= 768px
 */
export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return { isDesktop };
}
