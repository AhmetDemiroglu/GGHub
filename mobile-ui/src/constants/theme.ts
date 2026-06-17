export const Colors = {
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceHighlight: '#334155',
    border: '#334155',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    primary: '#6366f1',
    primaryLight: '#818cf8',
    accent: '#8b5cf6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    card: '#1e293b',
    tabBar: '#0f172a',
    tabBarBorder: '#1e293b',
    inputBackground: '#1e293b',
    inputBorder: '#334155',
    placeholder: '#64748b',
    overlay: 'rgba(0, 0, 0, 0.7)',
    badge: '#ef4444',
    skeleton: '#334155',
    star: '#f59e0b',
  },
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceHighlight: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    primary: '#6366f1',
    primaryLight: '#818cf8',
    accent: '#8b5cf6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    card: '#ffffff',
    tabBar: '#ffffff',
    tabBarBorder: '#e2e8f0',
    inputBackground: '#f8fafc',
    inputBorder: '#e2e8f0',
    placeholder: '#94a3b8',
    overlay: 'rgba(0, 0, 0, 0.5)',
    badge: '#ef4444',
    skeleton: '#e2e8f0',
    star: '#f59e0b',
  },
};

export type ThemeColors = typeof Colors.dark;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 28,
  hero: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

/* ── Motion tokens ──
 * Tüm uygulama tutarlı animasyon hissi için tek nokta. Reanimated
 * spring/timing çağrıları bu değerleri referans alır.
 */
export const Durations = {
  fast: 180,
  normal: 260,
  slow: 400,
} as const;

export const Easings = {
  // Reanimated'in Easing karşılıkları (sayı factory değil, doğrudan eğri)
  out: 'easeOut' as const,
  inOut: 'easeInOut' as const,
  spring: 'spring' as const,
};

/* Reanimated withSpring config'leri */
export const Springs = {
  /** Yumuşak, doğal drawer/modal geçişleri */
  smooth: { damping: 26, stiffness: 280, mass: 0.8 },
  /** Snappy - buton/sekmeler için hızlı tepki */
  snappy: { damping: 18, stiffness: 380, mass: 0.6 },
  /** Bouncy - oyuncu platformu için hafif zıpzıp his (beğeni/takip) */
  bouncy: { damping: 12, stiffness: 420, mass: 0.7 },
} as const;

/* ── Elevation / Shadow tokens ──
 * iOS shadow + Android elevation ayrımı tutarlı kalıbında.
 */
export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export const Shadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 8 },
  xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 14 },
} as const;
