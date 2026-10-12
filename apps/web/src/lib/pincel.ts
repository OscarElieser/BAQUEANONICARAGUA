// Trazos de pincel generados con una semilla fija: siempre salen iguales (en el servidor y en el navegador),
// así la "ventana pintada" de la portada no cambia entre visitas ni produce diferencias al hidratar.

/** Generador de números pseudoaleatorios con semilla (mulberry32): mismo número de partida, misma secuencia. */
export function azar(semilla: number): () => number {
  let a = semilla >>> 0; // Estado interno como entero sin signo
  return () => {
    a = (a + 0x6d2b79f5) >>> 0; // Avanza el estado
    let t = a; // Copia para mezclar los bits
    t = Math.imul(t ^ (t >>> 15), t | 1); // Primera mezcla
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); // Segunda mezcla
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // Número entre 0 y 1
  };
}

/** Borde irregular: suma de ondas suaves con fases al azar más un temblor fino, como la orilla de una pincelada. */
function borde(r: () => number, amplitud: number): (x: number) => number {
  const ondas = [0, 1, 2].map(() => ({ f: 0.004 + r() * 0.02, fase: r() * Math.PI * 2, a: amplitud * (0.3 + r() * 0.7) })); // Tres ondas distintas
  return (x) => ondas.reduce((s, o) => s + Math.sin(x * o.f + o.fase) * o.a, 0) + (r() - 0.5) * amplitud * 0.5; // Ondas más temblor
}

const n = (v: number) => Math.round(v * 10) / 10; // Redondea a un decimal: trazos más cortos en el HTML

export type Pincelada = { d: string; x0: number; x1: number }; // Trazo listo para dibujar y su extensión horizontal

/**
 * Bandas horizontales de pincel que, juntas, forman la ventana de la portada.
 * Cada banda tiene orillas irregulares y, en los extremos, cerdas sueltas que se adelgazan.
 */
export function pinceladas(semilla: number, ancho = 1200, alto = 560, bandas = 8): Pincelada[] {
  const r = azar(semilla); // Secuencia fija
  const res: Pincelada[] = []; // Trazos generados
  const paso = alto / bandas; // Alto que le toca a cada banda
  for (let i = 0; i < bandas; i++) {
    const yc = paso * (i + 0.5); // Centro vertical de la banda
    const grosor = paso * (1.5 + r() * 0.4); // Más alto que su espacio: las bandas se solapan sin huecos
    const extremo = i === 0 || i === bandas - 1 ? 70 : 0; // Las bandas de arriba y abajo, más cortas: la ventana se redondea
    const x0 = 24 + r() * 46 + extremo; // Inicio (poca variación entre bandas: borde parejo pero vivo)
    const x1 = ancho - 24 - r() * 46 - extremo; // Final
    const arriba = borde(r, 6), abajo = borde(r, 6); // Orillas superior e inferior
    const puntos: string[] = []; // Contorno de la banda
    for (let x = x0; x <= x1; x += 10) puntos.push(`${n(x)} ${n(yc - grosor / 2 + arriba(x))}`); // Orilla de arriba, de izquierda a derecha
    for (let x = x1; x >= x0; x -= 10) puntos.push(`${n(x)} ${n(yc + grosor / 2 + abajo(x))}`); // Orilla de abajo, de vuelta
    let d = `M${puntos.join('L')}Z`; // Cuerpo de la banda
    for (const lado of [-1, 1]) {
      const borde0 = lado < 0 ? x0 : x1; // Extremo donde salen las cerdas
      const cerdas = 9 + Math.floor(r() * 7); // Entre 9 y 15 cerdas
      for (let c = 0; c < cerdas; c++) {
        const y = yc + (r() - 0.5) * grosor * 0.9; // Altura de la cerda dentro de la banda
        const g = 2 + r() * r() * 14; // Grosor de la cerda: casi todas finas, algunas gruesas
        const largo = 10 + r() * r() * 70; // Cuánto sobresale: casi todas cortas, pocas largas
        const punta = borde0 + lado * largo; // Dónde termina
        const raiz = borde0 - lado * 20; // Empieza dentro de la banda para no dejar costura
        d += `M${n(raiz)} ${n(y - g / 2)}L${n(punta)} ${n(y + (r() - 0.5) * 3)}L${n(raiz)} ${n(y + g / 2)}Z`; // Cerda: triángulo que se adelgaza
      }
    }
    res.push({ d, x0, x1 }); // Guarda la banda
  }
  return res;
}
