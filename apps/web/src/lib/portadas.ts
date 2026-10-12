// Datos para dibujar la portada de cada territorio a partir de su forma real (content/territorios/mapa.json).
// Nada aquí es una foto ni un dato inventado: es la silueta del territorio, con curvas de nivel ilustrativas.

import mapa from '@/content/mapa.json'; // Mapa generado desde Natural Earth

export type Zona = 'pacifico' | 'norte' | 'caribe'; // Zona de paisaje (agrupación de diseño, no oficial)
export type TerritorioMapa = { slug: string; name: string; zone: Zona; d: string; label: number[] }; // Territorio del mapa

/** Colores de cada zona, todos del sistema de diseño (variables CSS de globals.css). */
export const PALETA: Record<Zona, { fondo: string; curva: string; cima: string }> = {
  pacifico: { fondo: 'var(--zona-pacifico)', curva: 'var(--terracota)', cima: 'var(--oro)' }, // Ceniza, lava y oro
  norte: { fondo: 'var(--zona-norte)', curva: 'var(--musgo)', cima: 'var(--band-maiz)' }, // Neblina, musgo y maíz
  caribe: { fondo: 'var(--band-anil)', curva: 'var(--caribe)', cima: 'var(--band-marfil)' }, // Añil, mar y arena
};

/** Clave del nombre de cada zona en los textos traducidos. */
export const ZONA_TEXTO = { pacifico: 'zone.pacifico', norte: 'zone.norte', caribe: 'zone.caribe' } as const; // Para t(locale, …)

export const territorios = mapa.territories as TerritorioMapa[]; // Los 17 territorios
export const lagos = mapa.lakes as { id: string; name: string; d: string }[]; // Cocibolca y Xolotlán

/** Rectángulo que contiene un trazo SVG (solo M, L y Z, que es lo que genera scripts/mapa). */
export function cajaDe(d: string): { x: number; y: number; w: number; h: number } {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []; // Todos los números del trazo
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; // Extremos
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i]!, y = nums[i + 1]!; // Par de coordenadas
    if (x < minX) minX = x; // Extremo izquierdo
    if (x > maxX) maxX = x; // Extremo derecho
    if (y < minY) minY = y; // Extremo superior
    if (y > maxY) maxY = y; // Extremo inferior
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }; // Caja
}

/** Encuadre de la portada: la silueta centrada, con aire alrededor, en la proporción pedida (ancho/alto). */
export function encuadre(d: string, proporcion = 4 / 5, aire = 0.14): string {
  const c = cajaDe(d); // Caja de la silueta
  let w = c.w * (1 + aire * 2), h = c.h * (1 + aire * 2); // Caja con margen
  if (w / h > proporcion) h = w / proporcion; // Más ancha que la portada: crece en alto
  else w = h * proporcion; // Más alta: crece en ancho
  const x = c.x + c.w / 2 - w / 2, y = c.y + c.h / 2 - h / 2; // Centrada
  return `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`; // viewBox
}

/** Escalas de las curvas de nivel: de la orilla (1) hacia la cima. */
export const CURVAS = [1, 0.84, 0.69, 0.55, 0.42, 0.3, 0.19]; // Siete anillos, más juntos cerca de la cima

/** Número estable a partir del slug (para variar levemente cada portada sin azar). */
export function semilla(slug: string): number {
  let h = 7; // Valor inicial
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 9973; // Mezcla cada letra
  return h; // Siempre el mismo para el mismo territorio
}

export function territorio(slug: string): TerritorioMapa | undefined {
  return territorios.find((t) => t.slug === slug); // Territorio por slug (o nada)
}

/** Los mismos colores de cada zona como números, para el relieve 3D (Three.js no lee variables CSS). */
export const PALETA_3D: Record<Zona, { base: number; curva: number; cima: number }> = {
  pacifico: { base: 0x2a1612, curva: 0xc65f3e, cima: 0xe4b063 }, // zona-pacifico, terracota, oro
  norte: { base: 0x0f3229, curva: 0x8db89a, cima: 0xe9b84a }, // zona-norte, musgo, band-maiz
  caribe: { base: 0x22306b, curva: 0x4fb8b0, cima: 0xf2efe5 }, // band-anil, caribe, band-marfil
};

/** Anillos de un trazo SVG (M, L, Z) como listas de puntos [x, y]. */
export function anillosDe(d: string): Array<Array<[number, number]>> {
  return d
    .split(/Z/i) // Un anillo por cada cierre
    .map((parte) => {
      const n = parte.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []; // Números del anillo
      const pts: Array<[number, number]> = []; // Puntos
      for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i]!, n[i + 1]!]); // Pares x, y
      return pts; // Anillo
    })
    .filter((r) => r.length >= 3); // Solo anillos con forma
}
