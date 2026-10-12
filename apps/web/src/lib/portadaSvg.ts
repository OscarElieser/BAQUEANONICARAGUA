// La portada de un territorio como texto SVG con colores fijos, para imágenes que no leen CSS
// (vista previa al compartir en redes y mensajería). Misma composición que components/PortadaTerritorio.tsx.

import { CURVAS, PALETA_3D, encuadre, lagos, territorio, territorios } from './portadas'; // Formas y colores

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`; // Número de color a texto #RRGGBB

/** SVG de la portada del territorio (o null si el slug no existe). proporcion = ancho / alto. */
export function portadaSvg(slug: string, proporcion = 1): string | null {
  const ter = territorio(slug); // Territorio
  if (!ter) return null; // Desconocido
  const c = PALETA_3D[ter.zone]; // Colores de su zona
  const caja = encuadre(ter.d, proporcion, 0.12); // Encuadre centrado
  const [bx, by, bw, bh] = caja.split(' ').map(Number) as [number, number, number, number]; // Encuadre como números
  const [lx, ly] = ter.label as [number, number]; // Cima
  const g = bw / 320; // Grosor base de línea, proporcional al encuadre (sin trazos que no escalan)
  const vecinos = territorios.filter((o) => o.slug !== slug).map((o) => `<path d="${o.d}" fill="none" stroke="${hex(c.curva)}" stroke-opacity="0.2" stroke-width="${g}"/>`).join(''); // Vecinos tenues
  const curvas = CURVAS.map((s, i) => {
    const relleno = i === CURVAS.length - 1 ? hex(c.cima) : 'none'; // La última es la cima
    return `<path d="${ter.d}" transform="translate(${lx} ${ly}) scale(${s}) translate(${-lx} ${-ly})" fill="${relleno}" stroke="${hex(c.curva)}" stroke-opacity="${0.4 + i * 0.09}" stroke-width="${(g * 1.4) / s}"/>`; // Curva encogida hacia la cima (grosor compensado)
  }).join(''); // Todas las curvas
  const agua = lagos.map((l) => `<path d="${l.d}" fill="#22306b" fill-rule="evenodd" stroke="#4fb8b0" stroke-opacity="0.6" stroke-width="${g}"/>`).join(''); // Lagos reales
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${caja}">` + // Lienzo
    `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${hex(c.base)}"/>` + // Fondo de la zona
    vecinos + // Vecinos
    `<clipPath id="s"><path d="${ter.d}"/></clipPath>` + // Recorte a la silueta
    `<g clip-path="url(#s)"><path d="${ter.d}" fill="${hex(c.curva)}" fill-opacity="0.1"/>${curvas}</g>` + // Tierra y curvas
    `<path d="${ter.d}" fill="none" stroke="${hex(c.cima)}" stroke-width="${g * 2}"/>` + // Contorno
    agua + // Agua encima
    `</svg>`
  );
}
