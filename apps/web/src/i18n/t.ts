// Textos de la interfaz por idioma. La fuente es content/i18n; scripts/sync_i18n.py copia los archivos aquí.
// Funciona igual en componentes de servidor y de navegador (no depende de ninguna librería).

import de from '@/content/i18n/de.json'; // Alemán
import en from '@/content/i18n/en.json'; // Inglés
import es from '@/content/i18n/es.json'; // Español (original)
import fr from '@/content/i18n/fr.json'; // Francés
import it from '@/content/i18n/it.json'; // Italiano
import ja from '@/content/i18n/ja.json'; // Japonés
import ko from '@/content/i18n/ko.json'; // Coreano
import pt from '@/content/i18n/pt.json'; // Portugués
import ru from '@/content/i18n/ru.json'; // Ruso
import zhHans from '@/content/i18n/zh-Hans.json'; // Chino simplificado

export type MessageKey = Exclude<keyof typeof es, '_meta'>; // Claves válidas (TypeScript avisa si se escribe mal una)
type Dictionary = Record<string, unknown> & { _meta: { status: string; language: string } }; // Forma de cada archivo

const dictionaries: Record<string, Dictionary> = { es, en, 'zh-Hans': zhHans, ko, it, fr, pt, de, ru, ja }; // Todos los idiomas

/** Devuelve el texto en el idioma pedido (o en español si falta) con sus {variables} reemplazadas. */
export function t(locale: string, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const raw = (dictionaries[locale]?.[key] ?? es[key]) as string; // Texto del idioma o el original
  return raw.replace(/\{([A-Za-z0-9_]+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all)); // Reemplaza variables conocidas
}

/** Parte un texto con {variables} en trozos, para insertar enlaces u otros elementos en su lugar. */
export function tParts(locale: string, key: MessageKey): Array<{ text: string } | { slot: string }> {
  const raw = (dictionaries[locale]?.[key] ?? es[key]) as string; // Texto sin reemplazar
  return raw
    .split(/(\{[A-Za-z0-9_]+\})/g) // Corta alrededor de cada variable
    .filter(Boolean) // Quita trozos vacíos
    .map((p) => (/^\{[A-Za-z0-9_]+\}$/.test(p) ? { slot: p.slice(1, -1) } : { text: p })); // Variable o texto
}

/** Si la traducción de la interfaz en este idioma aún no la revisó una persona nativa. */
export function needsReview(locale: string): boolean {
  return dictionaries[locale]?._meta.status === 'needs_review'; // Solo los idiomas pendientes
}

/** Nombre del idioma escrito en ese mismo idioma (para el selector). */
export function languageName(locale: string): string {
  return dictionaries[locale]?._meta.language ?? locale; // Por ejemplo "Français"
}
