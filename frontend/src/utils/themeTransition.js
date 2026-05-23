/** @see https://developer.chrome.com/docs/web-platform/view-transitions */

const VEIL_RGB = {
  light: '245, 245, 247',
  dark: '0, 0, 0',
};

const DURATION_MS = 920;
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SOFT_EDGE_PX = 28;

let isTransitioning = false;

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
  return Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) * 1.18);
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/** Soft-edged hole mask: transparent center reveals new theme, outer ring shows old-theme veil */
function buildVeilMask(x, y, radiusPx) {
  const r = Math.max(0, radiusPx);
  const edge = r + SOFT_EDGE_PX;
  return `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, rgba(0,0,0,0.65) ${edge}px, #000 ${edge + 1}px)`;
}

function applyVeilMask(veil, x, y, r) {
  const mask = buildVeilMask(x, y, r);
  veil.style.maskImage = mask;
  veil.style.webkitMaskImage = mask;
}

function supportsViewTransition() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

function supportsWaapiPseudo() {
  try {
    return typeof document.body.animate === 'function';
  } catch {
    return false;
  }
}

/**
 * View Transition + Web Animations on ::view-transition-new(root).
 * `view-transition-name` on body so portaled header/nav are included in the snapshot.
 */
async function runViewTransitionAdvanced(onThemeApply, x, y, endRadius) {
  const body = document.body;
  body.classList.add('theme-transition-active');

  const transition = document.startViewTransition(() => {
    onThemeApply();
  });

  try {
    await transition.ready;

    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    const newAnim = body.animate(
      { clipPath },
      {
        duration: DURATION_MS,
        easing: EASING,
        fill: 'forwards',
        pseudoElement: '::view-transition-new(root)',
      },
    );

    const oldAnim = body.animate(
      { opacity: [1, 0.92, 0] },
      {
        duration: DURATION_MS,
        easing: EASING,
        fill: 'forwards',
        pseudoElement: '::view-transition-old(root)',
      },
    );

    await Promise.all([newAnim.finished, oldAnim.finished]);
    await transition.finished;
  } catch {
    transition.skipTransition?.();
    throw new Error('vt-fallback');
  } finally {
    body.classList.remove('theme-transition-active');
  }
}

/** rAF veil peel — works everywhere including portaled fixed UI */
function runVeilAdvanced(onThemeApply, x, y, endRadius, rgb) {
  const veil = document.createElement('div');
  veil.className = 'theme-transition-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.background = `rgb(${rgb})`;
  applyVeilMask(veil, x, y, 0);
  document.body.appendChild(veil);
  document.body.classList.add('theme-transition-active');

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      onThemeApply();

      const start = performance.now();

      const tick = (now) => {
        const t = Math.min(1, (now - start) / DURATION_MS);
        const r = easeOutCubic(t) * endRadius;
        applyVeilMask(veil, x, y, r);

        if (t < 1) {
          requestAnimationFrame(tick);
          return;
        }

        veil.remove();
        document.body.classList.remove('theme-transition-active');
        resolve();
      };

      requestAnimationFrame(tick);
    });
  });
}

/**
 * Advanced circular theme reveal from click.
 * @param {{ currentTheme: 'light'|'dark', origin: Event|{x:number,y:number}, onThemeApply: () => void }} opts
 */
export function runThemeTransition({ currentTheme, origin, onThemeApply }) {
  if (isTransitioning) {
    return Promise.resolve();
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    onThemeApply?.();
    return Promise.resolve();
  }

  const { x, y } = normalizeThemeOrigin(origin);
  const endRadius = maxRevealRadius(x, y);
  const rgb = VEIL_RGB[currentTheme] || VEIL_RGB.dark;

  isTransitioning = true;

  const finish = () => {
    isTransitioning = false;
  };

  const run = async () => {
    if (supportsViewTransition() && supportsWaapiPseudo()) {
      try {
        await runViewTransitionAdvanced(onThemeApply, x, y, endRadius);
        return;
      } catch {
        /* fall through to veil */
      }
    }
    await runVeilAdvanced(onThemeApply, x, y, endRadius, rgb);
  };

  return run().finally(finish);
}

export function isThemeTransitionRunning() {
  return isTransitioning;
}
