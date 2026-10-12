'use client'; // Interactivo: resalta el territorio bajo el cursor o el dedo

import Link from 'next/link'; // Enlaces internos
import { useState } from 'react'; // Territorio activo
import { t } from '@/i18n/t'; // Textos traducidos

export type TerritorioLigero = { slug: string; name: string; label: number[] }; // Lo mínimo de cada territorio (la forma viene de <SpriteMapa />)
type Territorio = TerritorioLigero; // Alias interno

/**
 * Mapa vivo de los 17 territorios. Cada territorio publicado es un enlace real a su ficha
 * (funciona con teclado, lector de pantalla y sin JavaScript); los que aún se verifican se ven
 * con borde punteado y lo dicen. Los lagos Cocibolca y Xolotlán se dibujan como agua.
 */
export function MapaTerritorios({ locale, published, territories, lakes, viewBox }: { locale: string; published: string[]; territories: TerritorioLigero[]; lakes: string[]; viewBox: string }) {
  const [active, setActive] = useState<Territorio | null>(null); // Territorio resaltado
  const isPublished = (slug: string) => published.includes(slug); // Si tiene ficha publicada

  return (
    <figure className="m-0 min-w-0">
      <div className="relative">
        <svg viewBox={viewBox} className="mapa-vivo block h-auto w-full" role="group" aria-label={t(locale, 'tmap.aria')}>
          <defs>
            <pattern id="curvas" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="9" cy="9" r="7" fill="none" stroke="var(--on-oro)" strokeOpacity="0.22" strokeWidth="1" /> {/* Curva de nivel repetida: relieve al resaltar */}
            </pattern>
            <pattern id="olas" width="24" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 5 Q6 1 12 5 T24 5" fill="none" stroke="var(--band-marfil)" strokeOpacity="0.35" strokeWidth="1" /> {/* Ondas del agua */}
            </pattern>
          </defs>
          {territories.map((ter) => {
            const on = active?.slug === ter.slug; // Si está resaltado
            const shape = (
              <>
                <use href={`#ter-${ter.slug}`} className={`territorio ${isPublished(ter.slug) ? 'publicado' : 'pendiente'} ${on ? 'activo' : ''}`} /> {/* Forma del territorio (de SpriteMapa) */}
                {on && <use href={`#ter-${ter.slug}`} fill="url(#curvas)" pointerEvents="none" />} {/* Relieve de curvas al resaltar */}
              </>
            ); // Dibujo del territorio
            return isPublished(ter.slug) ? (
              <Link
                key={ter.slug} // Territorio
                href={`/${locale}/territorios/${ter.slug}`} // Ficha
                aria-label={t(locale, 'tmap.open', { name: ter.name })} // Nombre accesible
                onMouseEnter={() => setActive(ter)} // Resalta con el cursor
                onMouseLeave={() => setActive(null)} // Quita el resalte
                onFocus={() => setActive(ter)} // Resalta con el teclado
                onBlur={() => setActive(null)} // Quita el resalte
              >
                {shape}
              </Link>
            ) : (
              <g
                key={ter.slug} // Territorio
                role="img" // Para lectores de pantalla es una imagen con nombre
                aria-label={t(locale, 'tmap.unpublished', { name: ter.name })} // Nombre y estado
                onMouseEnter={() => setActive(ter)} // Resalta con el cursor
                onMouseLeave={() => setActive(null)} // Quita el resalte
                onClick={() => setActive(ter)} // En el teléfono, tocar muestra el nombre
              >
                {shape}
              </g>
            );
          })}
          {lakes.map((id) => (
            <g key={id} pointerEvents="none">
              <use href={`#lago-${id}`} className="lago" /> {/* Agua (Ometepe queda como isla) */}
              <use href={`#lago-${id}`} fill="url(#olas)" /> {/* Ondas */}
            </g>
          ))}
          {active && (
            <text x={active.label[0]} y={active.label[1]} textAnchor="middle" className="etiqueta-mapa" pointerEvents="none">
              {active.name} {/* Nombre del territorio resaltado */}
            </text>
          )}
        </svg>
        <p aria-live="polite" className="pointer-events-none absolute left-0 top-0 m-0 min-h-[56px] max-w-[60%] text-[15px]">
          {active ? (
            <>
              <span className="block font-display text-[24px] leading-tight">{active.name}</span> {/* Nombre */}
              <span className={isPublished(active.slug) ? 'text-status-verified' : 'text-oro-text'}>
                {isPublished(active.slug) ? t(locale, 'tmap.status_published') : t(locale, 'tmap.status_pending')} {/* Estado */}
              </span>
            </>
          ) : (
            <span className="text-ink-muted">{t(locale, 'tmap.hint')}</span> // Instrucción
          )}
        </p>
      </div>
      <figcaption className="mt-2 text-[13px] text-ink-muted">{t(locale, 'tmap.note')}</figcaption> {/* Fuente y aviso de límites aproximados */}
    </figure>
  );
}
