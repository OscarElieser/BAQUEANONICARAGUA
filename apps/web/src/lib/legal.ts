// Textos legales e institucionales. La fuente única es content/legal en la raíz del repositorio;
// scripts/sync_legal.py copia el archivo aquí y CI comprueba que no se desalineen.

import es from '@/content/legal/es.json'; // Textos en español (copia sincronizada)

/** Una sección: título y párrafos o lista de puntos. */
export interface LegalSection {
  heading: string; // Título de la sección
  body?: string[]; // Párrafos
  items?: string[]; // Lista de puntos
}

/** Una página legal completa. */
export interface LegalPage {
  slug: string; // Dirección de la página (por ejemplo "privacidad")
  title: string; // Título
  summary: string; // Resumen de una línea
  sections: LegalSection[]; // Secciones
}

/** Archivo de textos de un idioma. */
interface LegalFile {
  version: string; // Fecha de la versión vigente
  status_note: string; // Aviso de que es un borrador para revisión legal
  pages: LegalPage[]; // Páginas
}

const byLocale: Record<string, LegalFile> = { es }; // Idiomas con texto propio (los demás muestran el español)

/** Devuelve los textos del idioma pedido o, si aún no están traducidos, los de español. */
export function legalFor(locale: string): { file: LegalFile; translated: boolean } {
  const file = byLocale[locale]; // Busca el idioma pedido
  return file ? { file, translated: true } : { file: es, translated: false }; // Español como respaldo, avisando
}

/** Direcciones de todas las páginas legales (para generar las rutas). */
export const legalSlugs = es.pages.map((p) => p.slug); // Mismo orden que en el archivo

/** Convierte un texto en trozos, separando los [marcador: …] para resaltarlos. */
export function splitMarkers(text: string): Array<{ marker: boolean; text: string }> {
  return text
    .split(/(\[marcador:[^\]]*\])/g) // Corta antes y después de cada marcador
    .filter(Boolean) // Quita trozos vacíos
    .map((part) => ({ marker: part.startsWith('[marcador:'), text: part })); // Marca cuáles son marcadores
}
