'use client'; // Interactivo: cambia la escena y mueve las capas con el cursor

import { useEffect, useState } from 'react'; // Estado y efectos
import { t } from '@/i18n/t'; // Textos traducidos
import { ZONA_TEXTO, type Zona } from '@/lib/portadas'; // Nombres de las zonas de paisaje

const ESCENAS: Zona[] = ['pacifico', 'norte', 'caribe']; // Orden de las escenas: de oeste a este

/**
 * Pie de la ventana de la portada: dice qué escena se ve (y que es una ilustración)
 * y ofrece tres barras para cambiarla. También mueve las capas del dibujo con el cursor (paralaje suave).
 */
type Credito = { lugar: string; texto: string; pagina: string } | null; // Crédito de la foto de una escena

export function ControlPortada({ locale, portada, creditos }: { locale: string; portada: string; creditos: Record<Zona, Credito> }) {
  const [escena, setEscena] = useState<Zona>('pacifico'); // Escena visible

  useEffect(() => {
    const el = document.getElementById(portada); // Sección de la portada
    if (!el) return; // Sin portada
    el.dataset.escena = escena; // El CSS muestra solo la escena elegida (con fundido)
    el.querySelectorAll<SVGImageElement>(`.escena[data-id="${escena}"] image[data-href]`).forEach((img) => {
      img.setAttribute('href', img.dataset.href ?? ''); // Carga la foto de la escena al elegirla por primera vez
      img.removeAttribute('data-href'); // Ya no hace falta
    });
  }, [escena, portada]); // Cada vez que cambia la escena

  useEffect(() => {
    const el = document.getElementById(portada); // Sección de la portada
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // Quien pidió menos movimiento no lo recibe
    const tactil = window.matchMedia('(pointer: coarse)').matches; // En pantallas táctiles no hay cursor que seguir
    if (!el || quieto || tactil) return; // Sin paralaje
    let cuadro = 0; // Pedido de dibujo pendiente
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(); // Posición de la portada en pantalla
      const px = ((e.clientX - r.left) / r.width) * 2 - 1, py = ((e.clientY - r.top) / r.height) * 2 - 1; // De −1 a 1 en cada eje
      cancelAnimationFrame(cuadro); // Un solo cambio por cuadro
      cuadro = requestAnimationFrame(() => {
        el.style.setProperty('--px', Math.max(-1, Math.min(1, px)).toFixed(3)); // Posición horizontal del cursor
        el.style.setProperty('--py', Math.max(-1, Math.min(1, py)).toFixed(3)); // Posición vertical del cursor
      });
    };
    el.addEventListener('pointermove', mover); // Sigue al cursor solo dentro de la portada
    return () => {
      el.removeEventListener('pointermove', mover); // Limpia al salir de la página
      cancelAnimationFrame(cuadro); // Cancela lo pendiente
    };
  }, [portada]); // Una vez por portada

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="m-0 text-[14px] text-ink-muted">
        {creditos[escena] ? (
          <>
            <span className="font-bold text-ink">{creditos[escena]!.lugar}</span>{' '} {/* Lugar real de la foto */}
            <a href={creditos[escena]!.pagina} target="_blank" rel="noopener noreferrer" className="credito-foto">{creditos[escena]!.texto}</a> {/* Autor y licencia, enlazados a Commons */}
          </>
        ) : (
          t(locale, 'hero.scene_caption', { zone: t(locale, ZONA_TEXTO[escena]) }) // Sin foto: dice que es una ilustración
        )}
      </p>
      <div role="group" aria-label={t(locale, 'hero.scenes_aria')} className="flex items-center">
        {ESCENAS.map((z) => (
          <button
            key={z} // Una barra por escena
            type="button" // No envía formularios
            aria-pressed={escena === z} // Dice si es la escena visible
            aria-label={t(locale, ZONA_TEXTO[z])} // Nombre de la zona
            onClick={() => setEscena(z)} // Muestra esa escena
            className={`barra-escena zt-${z}`} // Barra con el color de la zona
          >
            <span aria-hidden="true" /> {/* La barra visible (el botón es más grande, para tocar con el dedo) */}
          </button>
        ))}
      </div>
    </div>
  );
}
