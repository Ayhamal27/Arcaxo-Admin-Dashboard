export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export const GRID_COLUMNS = {
  DESKTOP: 12,
  TABLET: 6,
  MOBILE: 2,
} as const;

export const GRID_GUTTER = {
  DESKTOP: 15,
  TABLET: 15,
  MOBILE: 20,
} as const;

export const BREAKPOINTS = {
  MOBILE: 320,
  TABLET: 768,
  DESKTOP: 1920,
} as const;

export const APP_NAME = 'Arcaxo Admin Dashboard';
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
