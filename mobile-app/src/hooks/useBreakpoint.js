import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

const BREAKPOINT = 768;

/**
 * Single source of truth for breakpoint. Matches Tailwind md (768px).
 * @returns {{ isDesktop: boolean }}
 */
export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(() => {
    const { width } = Dimensions.get('window');
    return width >= BREAKPOINT;
  });

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setIsDesktop(window.width >= BREAKPOINT);
    });
    return () => sub?.remove?.();
  }, []);

  return { isDesktop };
}
