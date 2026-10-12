// Las formas del mapa (17 territorios y 2 lagos) definidas UNA sola vez por página.
// Portadas, tarjetas y el mapa vivo las reutilizan con <use href="#ter-…">: así la página no repite
// cientos de kilobytes de trazos (antes la portada pesaba más de 1 MB solo por esto).
import { lagos, territorios } from '@/lib/portadas'; // Formas reales del mapa

export function SpriteMapa() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute h-0 w-0 overflow-hidden">
      {/* Biblioteca invisible de formas */}
      <defs>
        {territorios.map((t) => (
          <path key={t.slug} id={`ter-${t.slug}`} d={t.d} vectorEffect="non-scaling-stroke" /> // Silueta de cada territorio (el grosor del borde no cambia al escalar)
        ))}
        {lagos.map((l) => (
          <path key={l.id} id={`lago-${l.id}`} d={l.d} fillRule="evenodd" vectorEffect="non-scaling-stroke" /> // Cada lago (las islas quedan como huecos)
        ))}
        <g id="pais-todo">
          {/* Todos los territorios juntos: sirve para trazar los vecinos con un solo elemento */}
          {territorios.map((t) => (
            <use key={t.slug} href={`#ter-${t.slug}`} /> // Reutiliza cada silueta
          ))}
        </g>
      </defs>
    </svg>
  );
}
