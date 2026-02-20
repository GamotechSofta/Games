/**
 * Theme matching frontend mobile view (Tailwind → React Native)
 * Tailwind 1 unit = 4px. max-w-lg = 512px, max-w-md = 448px.
 */
export const colors = {
  // Backgrounds
  black: '#000000',
  background: '#0a0a0a',
  backgroundAlt: '#0a0a0b',
  surface: '#1a1a1a',
  surfaceDark: '#141416',
  surfaceInput: 'rgba(31,41,55,0.8)', // gray-800/80
  surfaceCard: '#202124',
  gray800: '#1f2937',
  surfaceSubHeader: '#1a2332',
  surfaceSubHeaderEnd: '#1f2a3a',
  // Accent / gold
  gold: '#d4af37',
  goldLight: '#f3b61b',
  goldDark: '#e5a914',
  goldText: '#f2c14e',
  goldOrange: '#f5a623',
  amber: '#f59e0b',
  amberBorder: 'rgba(245,158,11,0.9)',
  amberText: 'rgba(251,191,36,0.9)',
  yellow: '#eab308',
  // Text
  text: '#ffffff',
  textSecondary: '#d1d5db',   // gray-300
  textMuted: '#9ca3af',       // gray-400
  textDim: '#6b7280',         // gray-500
  placeholder: '#6b7280',
  // Borders
  border: 'rgba(255,255,255,0.05)',
  borderLight: 'rgba(255,255,255,0.1)',
  borderGray: 'rgba(55,65,81,0.5)',
  borderAmber: 'rgba(251,191,36,0.3)',
  borderAmberStrong: 'rgba(234,179,8,0.6)',
  // Status
  green: '#22c55e',
  red: '#ef4444',
  redBg: 'rgba(239,68,68,0.1)',
  redBorder: 'rgba(239,68,68,0.3)',
  redText: '#fca5a5',
};

export const spacing = {
  px: 4,
  '1': 4,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
};

export const borderRadius = {
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

export const fontSize = {
  '9px': 9,
  '10px': 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};
