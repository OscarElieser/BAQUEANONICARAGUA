// El icono del sitio (la silueta real del país en bandas de curvas de nivel) como texto SVG.
// Misma composición que scripts/generar_icono.py, que produce public/icono.svg.
import { territorios } from './portadas'; // Los 17 territorios del mapa

const VERDE = '#0D5448', ORO = '#E4B063', TERRACOTA = '#C65F3E'; // Colores del sistema de diseño
const CX = 500, CY = 470; // Centro hacia el que se encogen las bandas
const ESCALAS = [1, 0.74, 0.5, 0.28]; // Bandas de afuera hacia adentro

export function iconoSvg(): string {
  const silueta = territorios.map((t) => t.d).join(' '); // Silueta del país
  const usos = ESCALAS.map((s, i) => {
    const color = i % 2 === 0 ? ORO : VERDE; // Alterna oro y verde
    return `<use href="#pais" fill="${color}" stroke="${color}" stroke-width="${(3 / s).toFixed(1)}" stroke-linejoin="round" transform="translate(${CX} ${CY}) scale(${s}) translate(${-CX} ${-CY})"/>`; // Banda
  }).join(''); // Todas las bandas
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-120 -150 1240 1240"><rect x="-120" y="-150" width="1240" height="1240" rx="260" fill="${VERDE}"/><defs><path id="pais" d="${silueta}"/></defs>${usos}<circle cx="${CX}" cy="${CY}" r="34" fill="${TERRACOTA}"/></svg>`; // Icono completo
}
