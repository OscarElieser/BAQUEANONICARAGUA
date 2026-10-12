// Datos para buscadores: dirección canónica, versiones en los 10 idiomas y datos estructurados.
// Así Google y los demás buscadores entienden qué página corresponde a cada idioma y no las ven como duplicadas.

import type { Metadata } from 'next'; // Tipo de los metadatos
import { defaultLocale, locales } from '@/i18n/config'; // Idiomas disponibles

/** Dirección pública del sitio (la fija el despliegue; en local se usa localhost). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''); // Sin barra final (una variable vacía cuenta como no configurada)

/** Dirección absoluta de una ruta en un idioma, por ejemplo absolute('en', '/cultura'). */
export function absolute(locale: string, path = ''): string {
  return `${SITE_URL}/${locale}${path}`; // Sitio + idioma + ruta
}

/** Mapa idioma → dirección de la misma página, más x-default (español) para quien no tenga idioma reconocido. */
export function languageAlternates(path = ''): Record<string, string> {
  const map: Record<string, string> = Object.fromEntries(locales.map((l) => [l, absolute(l, path)])); // Una dirección por idioma
  map['x-default'] = absolute(defaultLocale, path); // Versión por defecto
  return map; // Mapa completo
}

/** Metadatos de una página: título, descripción, canónica, idiomas y vista previa al compartir. */
export function pageMetadata(locale: string, path: string, title: string, description: string, opts: { noindex?: boolean } = {}): Metadata {
  return {
    title, // Título de la pestaña y del resultado de búsqueda
    description, // Resumen que muestran los buscadores
    alternates: { canonical: absolute(locale, path), languages: languageAlternates(path) }, // Dirección oficial y versiones en otros idiomas
    openGraph: { title, description, url: absolute(locale, path), locale, type: 'website' }, // Vista previa en redes y mensajería
    twitter: { card: 'summary', title, description }, // Vista previa en X
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}), // Páginas que no deben aparecer en buscadores, pero cuyos enlaces sí se siguen
  };
}

/** Convierte datos estructurados en el texto seguro para un <script type="application/ld+json">. */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c'); // Evita que un texto cierre la etiqueta script
}
