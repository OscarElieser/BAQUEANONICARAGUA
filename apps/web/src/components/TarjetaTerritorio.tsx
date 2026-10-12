'use client'; // Interactiva: se inclina siguiendo el cursor

import Link from 'next/link'; // Enlace interno
import type { PointerEvent } from 'react'; // Tipo del evento del puntero
import { PortadaTerritorio } from './PortadaTerritorio'; // Portada ilustrada
import { ZONA_TEXTO, type Zona } from '@/lib/portadas'; // Nombre de cada zona
import { t } from '@/i18n/t'; // Textos traducidos

type Props = { locale: string; slug: string; name: string; zone: Zona; published: boolean; uid: string; interactive?: boolean }; // Datos de la tarjeta

/** Inclina la tarjeta hacia el cursor (solo con ratón o lápiz; en pantallas táctiles no hace nada). */
function inclinar(e: PointerEvent<HTMLElement>) {
  if (e.pointerType === 'touch') return; // Con el dedo no se inclina: se desplaza la página
  const el = e.currentTarget; // Tarjeta
  const r = el.getBoundingClientRect(); // Posición y tamaño
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; // Posición relativa (0 a 1)
  el.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`); // Giro horizontal (máx. 6°)
  el.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(2)}deg`); // Giro vertical (máx. 6°)
  el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); // Brillo sigue al cursor (horizontal)
  el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`); // Brillo sigue al cursor (vertical)
}

/** Devuelve la tarjeta a su posición. */
function soltar(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget; // Tarjeta
  el.style.setProperty('--rx', '0deg'); // Sin giro vertical
  el.style.setProperty('--ry', '0deg'); // Sin giro horizontal
}

/** Tarjeta de un territorio: portada, nombre, zona y estado. Si tiene ficha publicada, es un enlace. */
export function TarjetaTerritorio({ locale, slug, name, zone, published, uid, interactive = true }: Props) {
  const cuerpo = (
    <>
      <span className="tarjeta-lamina">
        <PortadaTerritorio slug={slug} uid={uid} className="block aspect-[4/5] w-full" /> {/* Portada ilustrada */}
        <span className="tarjeta-brillo" aria-hidden="true" /> {/* Reflejo que sigue al cursor */}
      </span>
      <span className="mt-3 block font-display text-[22px] leading-tight">{name}</span> {/* Nombre */}
      <span className="mt-1 block text-[14px] text-ink-muted">{t(locale, ZONA_TEXTO[zone])}</span> {/* Zona de paisaje */}
      <span className={`block text-[14px] ${published ? 'text-status-verified' : 'text-oro-text'}`}>
        {t(locale, published ? 'tmap.status_published' : 'tmap.status_pending')} {/* Estado en texto, no solo color */}
      </span>
    </>
  ); // Contenido común

  const eventos = interactive ? { onPointerMove: inclinar, onPointerLeave: soltar } : {}; // Inclinación solo si se pide
  return published && interactive ? (
    <Link href={`/${locale}/territorios/${slug}`} className="tarjeta-3d block text-ink no-underline" {...eventos}>
      {cuerpo}
    </Link>
  ) : (
    <div className="tarjeta-3d" {...eventos}>
      {cuerpo}
    </div>
  );
}
