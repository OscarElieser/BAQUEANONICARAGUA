// Idiomas iniciales (sección 18). Añadir uno = añadir aquí + carpeta de mensajes.
export const locales = ['es', 'en', 'zh-Hans', 'ko', 'it', 'fr', 'pt', 'de', 'ru', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

// Fuentes por sistema de escritura (se cargan solo cuando el idioma lo requiere).
export const scriptFont: Record<Locale, 'latin' | 'cyrillic' | 'cjk-sc' | 'cjk-jp' | 'hangul'> = {
  es: 'latin', en: 'latin', it: 'latin', fr: 'latin', pt: 'latin', de: 'latin',
  ru: 'cyrillic', 'zh-Hans': 'cjk-sc', ja: 'cjk-jp', ko: 'hangul',
};
