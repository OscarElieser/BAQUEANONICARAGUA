// Tres escenas ilustradas (no fotos) para la ventana de pincel de la portada: una por zona de paisaje.
// Son dibujos genéricos del paisaje de cada zona, no retratos de un lugar exacto; la portada lo dice ("Ilustración").
// Todos los colores salen del sistema de diseño (variables CSS); las mezclas se hacen con color-mix.
import type { CSSProperties } from 'react'; // Tipo de los estilos en línea

const mez = (a: string, pct: number, b: string) => `color-mix(in oklab, var(--${a}) ${pct}%, ${b.startsWith('#') || b === 'white' ? b : `var(--${b})`})`; // Mezcla dos colores del sistema
const f = (fill: string, extra: CSSProperties = {}): CSSProperties => ({ fill, ...extra }); // Relleno como estilo (las variables CSS no funcionan como atributo)

/** Bandada de aves: unas pocas "V" en el cielo, como gaviotas o garzas a lo lejos. */
function Aves({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g style={{ stroke: color, fill: 'none', strokeWidth: 2.4, strokeLinecap: 'round' }}>
      {[[0, 0, 1], [38, -14, 0.8], [70, 8, 0.65], [-34, 18, 0.7]].map(([dx, dy, s], i) => (
        <path key={i} d={`M${x + dx - 12 * s} ${y + dy - 4 * s}q${6 * s} ${-6 * s} ${12 * s} 0q${6 * s} ${-6 * s} ${12 * s} 0`} /> // Un ave: dos curvas
      ))}
    </g>
  );
}

/** Pacífico volcánico: un lago con dos volcanes que se reflejan, sol de tarde y orilla de arena. */
export function EscenaPacifico() {
  return (
    <g>
      <defs>
        <linearGradient id="pb-cielo-p" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: mez('marca-turquesa', 55, 'white') }} /> {/* Cielo alto */}
          <stop offset="0.75" style={{ stopColor: mez('band-marfil', 80, 'marca-naranja') }} /> {/* Cielo cálido cerca del horizonte */}
        </linearGradient>
        <linearGradient id="pb-lago-p" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: mez('marca-turquesa', 70, 'band-anil') }} /> {/* Agua lejana */}
          <stop offset="1" style={{ stopColor: 'var(--band-anil)' }} /> {/* Agua cercana, más profunda */}
        </linearGradient>
      </defs>
      <rect width="1200" height="560" style={f('url(#pb-cielo-p)')} /> {/* Cielo */}
      <g className="capa-lejos">
        <circle cx="905" cy="215" r="92" style={f('var(--marca-naranja)', { opacity: 0.18 })} /> {/* Halo del sol */}
        <circle cx="905" cy="215" r="54" style={f('var(--marca-naranja)')} /> {/* Sol de la tarde */}
        <path d="M0 350 Q140 300 260 330 T520 320 T820 330 T1200 312 V380 H0Z" style={f(mez('marca-turquesa', 35, 'white'))} /> {/* Cordillera lejana */}
      </g>
      <g className="capa-media">
        <path d="M300 372 C380 300 430 170 478 122 C492 110 506 112 518 124 C566 176 612 300 690 372Z" style={f(mez('marca-profundo', 85, 'marca-verde'))} /> {/* Volcán de cono alto */}
        <path d="M466 128 C474 104 500 96 512 112 C530 90 560 96 552 120" style={{ fill: 'none', stroke: mez('band-marfil', 85, 'white'), strokeWidth: 10, strokeLinecap: 'round', opacity: 0.85 }} /> {/* Penacho de nubes en la cima */}
        <path d="M640 372 C690 300 730 220 790 205 C850 192 902 280 980 372Z" style={f(mez('marca-verde', 75, 'marca-profundo'))} /> {/* Volcán más bajo y redondeado */}
        <path d="M300 372 H980 V384 H300Z" style={f(mez('marca-verde', 60, 'marca-profundo'))} /> {/* Base de la isla */}
      </g>
      <rect y="380" width="1200" height="180" style={f('url(#pb-lago-p)')} /> {/* Lago */}
      <g style={{ opacity: 0.22 }}>
        <path d="M300 384 C380 450 430 560 478 600 H518 C566 560 612 450 690 384Z" style={f('var(--marca-profundo)')} /> {/* Reflejo del volcán alto */}
        <path d="M865 384 l40 150 l40 -150Z" style={f('var(--marca-naranja)')} /> {/* Reflejo del sol */}
      </g>
      <g style={{ stroke: 'var(--band-marfil)', strokeWidth: 2, fill: 'none', opacity: 0.5, strokeLinecap: 'round' }}>
        {[410, 440, 472, 506].map((y, i) => (
          <path key={y} d={`M${60 + i * 90} ${y} q30 -8 60 0 t60 0 M${620 + i * 70} ${y + 8} q30 -8 60 0 t60 0`} /> // Ondas del agua
        ))}
      </g>
      <g className="capa-cerca">
        <path d="M0 470 C160 450 300 500 420 560 H0Z" style={f(mez('band-maiz', 45, 'band-marfil'))} /> {/* Orilla de arena */}
        <path d="M0 500 C120 486 240 520 320 560 H0Z" style={f(mez('band-maiz', 65, 'terracota'), { opacity: 0.5 })} /> {/* Arena húmeda */}
      </g>
      <Aves x={250} y={150} color="var(--marca-profundo)" /> {/* Aves sobre el lago */}
    </g>
  );
}

/** Centro-norte de montaña: cerros en capas, neblina entre ellos y pinos al frente. */
export function EscenaNorte() {
  const pino = (x: number, base: number, h: number) => `M${x} ${base - h}L${x - h * 0.28} ${base - h * 0.45}H${x - h * 0.14}L${x - h * 0.36} ${base}H${x + h * 0.36}L${x + h * 0.14} ${base - h * 0.45}H${x + h * 0.28}Z`; // Pino de dos pisos
  return (
    <g>
      <defs>
        <linearGradient id="pb-cielo-n" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: mez('musgo', 35, 'white') }} /> {/* Cielo de montaña */}
          <stop offset="1" style={{ stopColor: mez('band-maiz', 25, 'white') }} /> {/* Claridad del amanecer */}
        </linearGradient>
        <linearGradient id="pb-neblina" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'white', stopOpacity: 0 }} /> {/* La neblina empieza transparente */}
          <stop offset="1" style={{ stopColor: 'white', stopOpacity: 0.85 }} /> {/* y se espesa abajo */}
        </linearGradient>
      </defs>
      <rect width="1200" height="560" style={f('url(#pb-cielo-n)')} /> {/* Cielo */}
      <g className="capa-lejos">
        <circle cx="300" cy="190" r="46" style={f('var(--band-maiz)', { opacity: 0.9 })} /> {/* Sol bajo entre la bruma */}
        <path d="M0 300 Q120 220 260 260 T520 230 T800 250 T1200 220 V560 H0Z" style={f(mez('musgo', 55, 'white'))} /> {/* Cerros más lejanos */}
        <rect y="230" width="1200" height="90" style={f('url(#pb-neblina)')} /> {/* Neblina */}
      </g>
      <g className="capa-media">
        <path d="M0 360 Q160 280 330 330 T700 300 T1000 320 T1200 290 V560 H0Z" style={f('var(--musgo)')} /> {/* Cerros medios */}
        <rect y="300" width="1200" height="110" style={f('url(#pb-neblina)')} /> {/* Segunda neblina */}
        <path d="M0 430 Q200 350 420 400 T860 380 T1200 400 V560 H0Z" style={f('var(--marca-verde)')} /> {/* Ladera cercana */}
      </g>
      <g className="capa-cerca" style={f('var(--zona-norte)')}>
        <path d="M0 500 Q300 450 600 490 T1200 470 V560 H0Z" /> {/* Primer plano */}
        {[[70, 520, 150], [150, 515, 110], [990, 505, 170], [1090, 512, 130], [1160, 520, 95]].map(([x, b, h]) => (
          <path key={x} d={pino(x, b, h)} /> // Pinos al frente
        ))}
      </g>
      <Aves x={820} y={160} color="var(--zona-norte)" /> {/* Aves sobre el valle */}
    </g>
  );
}

/** Caribe: mar turquesa, cayos con palmeras, nubes y una panga a lo lejos. */
export function EscenaCaribe() {
  const palmera = (x: number, y: number, s: number) => (
    <g key={x} style={{ stroke: 'var(--marca-profundo)', fill: 'none', strokeLinecap: 'round' }}>
      <path d={`M${x} ${y} q${8 * s} ${-40 * s} ${-6 * s} ${-90 * s}`} style={{ strokeWidth: 6 * s }} /> {/* Tronco curvo */}
      {[[-60, -6], [-34, 26], [40, -10], [54, 22], [4, -40]].map(([dx, dy], i) => (
        <path key={i} d={`M${x - 6 * s} ${y - 90 * s} q${dx * 0.5 * s} ${(dy - 30) * s * 0.5} ${dx * s} ${dy * s}`} style={{ strokeWidth: 5 * s, stroke: 'var(--marca-verde)' }} /> // Hoja de palma
      ))}
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id="pb-cielo-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: mez('caribe', 45, 'white') }} /> {/* Cielo del Caribe */}
          <stop offset="1" style={{ stopColor: mez('band-marfil', 90, 'white') }} /> {/* Horizonte claro */}
        </linearGradient>
        <linearGradient id="pb-mar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--caribe)' }} /> {/* Mar turquesa */}
          <stop offset="1" style={{ stopColor: mez('marca-turquesa', 80, 'band-anil') }} /> {/* Mar profundo */}
        </linearGradient>
      </defs>
      <rect width="1200" height="560" style={f('url(#pb-cielo-c)')} /> {/* Cielo */}
      <g className="capa-lejos" style={f('white', { opacity: 0.9 })}>
        <path d="M180 150 a34 34 0 0 1 64 -12 a28 28 0 0 1 48 18 a22 22 0 0 1 -6 42 h-110 a24 24 0 0 1 4 -48Z" /> {/* Nube */}
        <path d="M760 110 a28 28 0 0 1 52 -10 a24 24 0 0 1 40 14 a18 18 0 0 1 -4 34 h-92 a20 20 0 0 1 4 -38Z" /> {/* Otra nube */}
      </g>
      <rect y="300" width="1200" height="260" style={f('url(#pb-mar)')} /> {/* Mar */}
      <g style={{ stroke: 'white', strokeWidth: 2, fill: 'none', opacity: 0.45, strokeLinecap: 'round' }}>
        {[340, 380, 430, 490].map((y, i) => (
          <path key={y} d={`M${100 + i * 140} ${y} h${80 + i * 20} M${700 - i * 60} ${y + 14} h${60 + i * 25}`} /> // Brillos del agua
        ))}
      </g>
      <g className="capa-media">
        <ellipse cx="840" cy="318" rx="120" ry="14" style={f(mez('band-maiz', 40, 'band-marfil'))} /> {/* Cayo lejano */}
        {palmera(810, 314, 0.7)} {/* Palmera del cayo lejano */}
        {palmera(870, 316, 0.55)} {/* Otra palmera */}
        <path d="M430 352 h70 l-10 12 h-52Z M462 352 v-26 l18 22Z" style={f('var(--marca-profundo)')} /> {/* Panga con su toldo */}
      </g>
      <g className="capa-cerca">
        <path d="M720 560 C780 470 960 440 1200 450 V560Z" style={f(mez('band-maiz', 45, 'band-marfil'))} /> {/* Playa cercana */}
        {palmera(1020, 470, 1.4)} {/* Palmera grande al frente */}
        {palmera(1120, 462, 1.1)} {/* Segunda palmera */}
      </g>
      <Aves x={520} y={170} color="var(--marca-profundo)" /> {/* Pelícanos a lo lejos */}
    </g>
  );
}
