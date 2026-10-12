// Greca escalonada: el motivo geométrico de la cerámica precolombina de la región (espiral cuadrada que se repite).
// Dibujo original hecho con código; decorativo (aria-hidden). Se traza una sola vez al llegar.

const UNIDAD = 48; // Ancho de cada espiral

/** Trazo de una espiral cuadrada que empieza en (x, base) y termina listo para la siguiente. */
function espiral(x: number, alto: number, invertida: boolean): string {
  const u = UNIDAD, a = alto; // Medidas
  const y = (v: number) => (invertida ? a - v : v); // Voltea en vertical una de cada dos (ritmo de la greca)
  return [
    `L${x} ${y(a)}`, // Baja a la base
    `L${x} ${y(4)}`, // Sube por el lado izquierdo
    `L${x + u * 0.83} ${y(4)}`, // Cruza arriba
    `L${x + u * 0.83} ${y(a * 0.72)}`, // Baja por el lado derecho
    `L${x + u * 0.25} ${y(a * 0.72)}`, // Vuelve hacia adentro
    `L${x + u * 0.25} ${y(a * 0.32)}`, // Sube
    `L${x + u * 0.58} ${y(a * 0.32)}`, // Centro de la espiral
    `L${x + u * 0.58} ${y(a * 0.5)}`, // Remate
    `L${x + u} ${y(a * 0.5)}`, // Sale hacia la siguiente
  ].join(''); // Tramo completo
}

export function Greca({ unidades = 32, alto = 40, className }: { unidades?: number; alto?: number; className?: string }) {
  const d = `M0 ${alto / 2}` + Array.from({ length: unidades }, (_, i) => espiral(i * UNIDAD, alto, i % 2 === 1)).join(''); // Friso completo
  return (
    <svg viewBox={`0 0 ${unidades * UNIDAD} ${alto}`} preserveAspectRatio="xMinYMid slice" className={className} aria-hidden="true" focusable="false">
      <path d={d} pathLength={1} className="greca-trazo" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" /> {/* La greca, que se traza al llegar */}
    </svg>
  );
}
