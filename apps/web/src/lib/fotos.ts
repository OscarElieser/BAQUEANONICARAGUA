// Catálogo de fotos reales con licencia libre (copiado desde content/fotos por scripts/sync_fotos.py).
import catalogo from '@/content/fotos.json'; // Fotos con autor, licencia y origen

export type Foto = { lugar: string; archivo: string; pagina: string; autor: string; licencia: string; licencia_url: string; fecha: string; descripcion: string; imagen: string; imagen_movil: string; ancho: number; alto: number }; // Datos de una foto

const fotos = catalogo.fotos as Record<string, Foto>; // Fotos por clave (slug del territorio o "portada-<zona>")

/** Foto de un territorio o de una escena de la portada (undefined si aún no hay). */
export function fotoDe(clave: string): Foto | undefined {
  return fotos[clave]; // Puede no existir: entonces se usa la ilustración
}

/** Todas las fotos, para la página de créditos. */
export function todasLasFotos(): Array<[string, Foto]> {
  return Object.entries(fotos); // Clave y foto
}

/** srcset de una foto: 800 px para teléfonos y 1600 px para pantallas grandes. */
export function srcsetDe(f: Foto): string {
  return `${f.imagen_movil} 800w, ${f.imagen} 1600w`; // El navegador elige la adecuada
}
