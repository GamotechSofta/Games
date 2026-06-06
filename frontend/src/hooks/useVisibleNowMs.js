import { useEffect, useState } from 'react';

/**
 * Current time (ms) updated on an interval only while the document tab is visible.
 * Pauses background ticks to reduce CPU when the user switches away.
 */
export function useVisibleNowMs(intervalMs = 1000, enabled = true) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;

    const ms = Math.max(1000, Number(intervalMs) || 1000);

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      setNowMs(Date.now());
    };

    tick();
    const id = setInterval(tick, ms);

    const onVisible = () => {
      if (document.visibilityState === 'visible') setNowMs(Date.now());
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled]);

  return nowMs;
}

export default useVisibleNowMs;
