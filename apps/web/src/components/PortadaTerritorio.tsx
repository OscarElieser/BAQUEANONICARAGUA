// Portada ilustrada de un territorio: su silueta real con curvas de nivel que suben hacia una cima.
// Cada una es distinta porque nace de la forma de su territorio y de los colores de su zona.
// Es decorativa (aria-hidden): el nombre y el estado siempre van en texto al lado.

import { CURVAS, PALETA, encuadre, lagos, semilla, territorio, territorios } from '@/lib/portadas'; // Formas y colores

export function PortadaTerritorio({ slug, uid, className }: { slug: string; uid: string; className?: string }) {
  const ter = territorio(slug); // Territorio a dibujar
  if (!ter) return null; // Slug desconocido: no se dibuja nada
  const color = PALETA[ter.zone]; // Colores de su zona
  const caja = encuadre(ter.d); // Encuadre centrado en la silueta
  const [bx, by, bw, bh] = caja.split(' ').map(Number) as [number, number, number, number]; // Encuadre como números
  const [lx, ly] = ter.label as [number, number]; // Punto interior lejos de los bordes: ahí va la cima
  const giro = (semilla(slug) % 70) - 35; // Ángulo propio de la textura de cada territorio (de -35° a 34°)
  const id = `${slug}-${uid}`; // Identificadores únicos aunque la portada se repita en la página

  return (
    <svg viewBox={caja} className={className} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <clipPath id={`silueta-${id}`}>
          <path d={ter.d} /> {/* Todo lo de adentro se recorta a la forma del territorio */}
        </clipPath>
        <pattern id={`textura-${id}`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform={`rotate(${giro})`}>
          {ter.zone === 'pacifico' && <path d="M0 4.5H9" stroke={color.curva} strokeOpacity="0.28" strokeWidth="0.8" />} {/* Ceniza: líneas finas */}
          {ter.zone === 'norte' && <circle cx="4.5" cy="4.5" r="1" fill={color.curva} fillOpacity="0.3" />} {/* Neblina: puntos */}
          {ter.zone === 'caribe' && <path d="M0 5Q2.25 2.5 4.5 5T9 5" fill="none" stroke={color.curva} strokeOpacity="0.3" strokeWidth="0.8" />} {/* Mar: ondas */}
        </pattern>
      </defs>
      <rect x={bx} y={by} width={bw} height={bh} fill={color.fondo} /> {/* Fondo de la zona */}
      {territorios
        .filter((o) => o.slug !== slug) // Todos menos este
        .map((o) => (
          <path key={o.slug} d={o.d} fill="none" stroke={color.curva} strokeOpacity="0.2" strokeWidth="1" vectorEffect="non-scaling-stroke" /> // Límite de un vecino, tenue
        ))}
      {/* Vecinos apenas trazados: ubican el territorio en el país */}
      <g clipPath={`url(#silueta-${id})`}>
        <path d={ter.d} fill={color.curva} fillOpacity="0.1" /> {/* Tierra del territorio */}
        <rect x={bx} y={by} width={bw} height={bh} fill={`url(#textura-${id})`} /> {/* Textura de su zona */}
        {CURVAS.map((s, i) => (
          <path
            key={s} // Una curva por escala
            d={ter.d} // Misma silueta…
            transform={`translate(${lx} ${ly}) scale(${s}) translate(${-lx} ${-ly})`} // …encogida hacia la cima
            fill={i === CURVAS.length - 1 ? color.cima : 'none'} // La última es la cima, rellena
            stroke={color.curva} // Color de las curvas de su zona
            strokeOpacity={0.4 + i * 0.09} // Más intensas cerca de la cima
            strokeWidth="1.4" // Grosor
            vectorEffect="non-scaling-stroke" // Mismo grosor aunque se encoja
          />
        ))}
      </g>
      <path d={ter.d} fill="none" stroke={color.cima} strokeWidth="2" vectorEffect="non-scaling-stroke" /> {/* Contorno del territorio */}
      {lagos.map((l) => (
        <path key={l.id} d={l.d} fill="var(--band-anil)" stroke="var(--caribe)" strokeOpacity="0.6" strokeWidth="1" vectorEffect="non-scaling-stroke" fillRule="evenodd" /> // Agua con su orilla (Ometepe queda como isla)
      ))}
      {/* Lagos reales encima: tapan la parte del límite que cruza el agua */}
    </svg>
  );
}
