const VEIL_COLORS = {
  light: '#f5f5f7',
  dark: '#000000',
};

const DURATION_MS = 850;

export function normalizeThemeOrigin(origin) {
  if (!origin) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  if (typeof origin.x === 'number' && typeof origin.y === 'number') {
    return { x: origin.x, y: origin.y };
  }
  const event = origin;
  if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return { x: event.clientX, y: event.clientY };
  }
  const el = event.currentTarget;
  if (el?.getBoundingClientRect) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function maxRevealRadius(x, y) {
  const { innerWidth: w, innerHeight: h } = window;
  return Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) * 1.15);
}

function setOriginVars(x, y, maxR) {
  const root = document.documentElement;
  root.style.setProperty('--theme-origin-x', `${x}px`);
  root.style.setProperty('--theme-origin-y', `${y}px`);
  root.style.setProperty('--theme-reveal-max', `${maxR}px`);
}

function clearOriginVars() {
  const root = document.documentElement;
  root.classList.remove('theme-transition-active');
  root.style.removeProperty('--theme-origin-x');
  root.style.removeProperty('--theme-origin-y');
  root.style.removeProperty('--theme-reveal-max');
}

function supportsViewTransition() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

/** View Transition API — real page snapshot expands from click (no solid overlay). */
function runViewTransition(onThemeApply, x, y, maxR) {
  const root = document.documentElement;
  setOriginVars(x, y, maxR);
  root.classList.add('theme-transition-active');

  const transition = document.startViewTransition(() => {
    onThemeApply();
  });

  const done = () => clearOriginVars();

  if (transition?.finished) {
    return transition.finished.then(done).catch(done);
  }
  done();
  return Promise.resolve();
}

/** Fallback: old-theme veil with growing transparent hole (CSS @property). */
function runVeilFallback(onThemeApply, x, y, maxR, veilColor) {
  const veil = document.createElement('div');
  veil.className = 'theme-transition-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.setProperty('--theme-x', `${x}px`);
  veil.style.setProperty('--theme-y', `${y}px`);
  veil.style.setProperty('--veil-bg', veilColor);
  veil.style.setProperty('--theme-max-r', `${maxR}px`);
  veil.style.setProperty('--theme-r', '0px');
  document.body.appendChild(veil);

  onThemeApply();

  return new Promise((resolve) => {
    const finish = () => {
      veil.remove();
      resolve();
    };

    requestAnimationFrame(() => {
      veil.classList.add('theme-transition-veil--animate');
      veil.addEventListener('animationend', finish, { once: true });
      window.setTimeout(finish, DURATION_MS + 120);
    });
  });
}

/**
 * Circular theme switch from click. Prefers View Transitions API (true page reveal).
 */
export function runThemeTransition({ currentTheme, origin, onThemeApply }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    onThemeApply?.();
    return Promise.resolve();
  }

  const { x, y } = normalizeThemeOrigin(origin);
  const maxR = maxRevealRadius(x, y);
  const veilColor = VEIL_COLORS[currentTheme] || VEIL_COLORS.dark;

  if (supportsViewTransition()) {
    return runViewTransition(onThemeApply, x, y, maxR);
  }

  return runVeilFallback(onThemeApply, x, y, maxR, veilColor);
}
