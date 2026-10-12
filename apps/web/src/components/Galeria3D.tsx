// Galería en arco 3D: una fila que se desliza a mano; la tarjeta del centro queda de frente y las de los lados
// giran hacia adentro, como en un carrusel curvo. El giro lo calcula el navegador con el propio desplazamiento
// (animaciones ligadas al scroll); donde no existe, la fila se ve plana y funciona igual.
// Sirve para cualquier catálogo: hoy las 17 portadas de territorio, y los destinos cuando se publiquen.
import type { ReactNode } from 'react'; // Tipo del contenido de cada tarjeta
import { ControlArco } from './ControlArco'; // Flechas anterior y siguiente

type Props = {
  id: string; // Identificador (une la galería con sus flechas)
  titulo: string; // Título visible
  intro?: string; // Texto breve bajo el título
  etiqueta: string; // Nombre accesible de la región que se desliza
  anterior: string; // Texto de la flecha izquierda
  siguiente: string; // Texto de la flecha derecha
  items: Array<{ key: string; contenido: ReactNode }>; // Tarjetas
  pie?: ReactNode; // Algo bajo las flechas (por ejemplo, el enlace a los créditos de las fotos)
};

export function Galeria3D({ id, titulo, intro, etiqueta, anterior, siguiente, items, pie }: Props) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="arco-escena">
      <div className="mx-auto max-w-[44ch] px-4 text-center">
        <h2 id={`${id}-titulo`} className="arco-titulo">{titulo}</h2> {/* Título centrado, editorial */}
        {intro && <p className="m-0 mt-3 text-[15px] leading-[24px] text-ink-muted">{intro}</p>} {/* Aclaración (por ejemplo: son ilustraciones) */}
      </div>
      <div className="arco" data-arco={id} role="region" aria-label={etiqueta} tabIndex={0}> {/* Enfocable: con el teclado se desliza con las flechas */}
        <ul className="arco-lista">
          {items.map((it, i) => (
            <li key={it.key} className="arco-item" style={{ ['--i' as string]: i }}>
              <div className="arco-carta">{it.contenido}</div> {/* Tarjeta (entra con una animación breve, una sola vez) */}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2 flex justify-center">
        <ControlArco id={id} anterior={anterior} siguiente={siguiente} /> {/* Flechas */}
      </div>
      {pie && <div className="mt-3 text-center">{pie}</div>} {/* Pie opcional */}
    </section>
  );
}
