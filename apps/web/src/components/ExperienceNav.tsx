'use client'; // Mide los enlaces para mover el indicador

import Link from 'next/link'; // Enlaces internos sin recargar
import { usePathname } from 'next/navigation'; // Ruta actual
import { useLayoutEffect, useRef, useState } from 'react'; // Medidas y estado
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

const experiences: Array<{ href: string; label: MessageKey }> = [
  { href: '', label: 'nav.discover' }, // Descubrir
  { href: '/mi-aventura', label: 'nav.adventure' }, // Mi aventura
  { href: '/comunidad', label: 'nav.community' }, // Comunidad
]; // Las tres experiencias con la clave de su texto

/**
 * Selector de las tres experiencias, en relieve suave (neumorfismo). Cada opción es una ruta real.
 * Un indicador hundido se desliza hasta la opción actual y sigue al cursor o al foco del teclado.
 */
export function ExperienceNav({ locale }: { locale: string }) {
  const pathname = usePathname() ?? ''; // Ruta actual
  const rest = pathname.replace(new RegExp(`^/${locale}`), ''); // Ruta sin el idioma
  const current = rest.startsWith('/mi-aventura') ? '/mi-aventura' : rest.startsWith('/comunidad') ? '/comunidad' : ''; // Experiencia actual
  const nav = useRef<HTMLElement>(null); // Contenedor
  const [apuntado, setApuntado] = useState<string | null>(null); // Opción bajo el cursor o con foco

  useLayoutEffect(() => {
    const el = nav.current; // Contenedor
    if (!el) return; // Aún no existe
    const objetivo = el.querySelector<HTMLElement>(`[data-ruta="${apuntado ?? current}"]`); // Opción a resaltar
    if (!objetivo) return; // Nada que medir
    el.style.setProperty('--x', `${objetivo.offsetLeft}px`); // Posición del indicador
    el.style.setProperty('--w', `${objetivo.offsetWidth}px`); // Ancho del indicador
    el.dataset.listo = 'true'; // Con medidas: se muestra el indicador deslizante
  }, [apuntado, current, locale]); // Al cambiar de página, de idioma o de opción apuntada

  return (
    <nav ref={nav} aria-label={t(locale, 'nav.aria')} className="nav-neu" onMouseLeave={() => setApuntado(null)}>
      <span aria-hidden="true" className="nav-indicador" /> {/* Indicador hundido que se desliza */}
      {experiences.map((e) => {
        const active = e.href === current; // Si es la página actual
        return (
          <Link
            key={e.href} // Experiencia
            href={`/${locale}${e.href}`} // Su ruta
            data-ruta={e.href} // Para medirla
            aria-current={active ? 'page' : undefined} // Página actual para lectores de pantalla
            onMouseEnter={() => setApuntado(e.href)} // El indicador sigue al cursor
            onFocus={() => setApuntado(e.href)} // Y al foco del teclado
            onBlur={() => setApuntado(null)} // Vuelve a la actual
            className="nav-opcion" // Estilo de la opción
          >
            {t(locale, e.label)} {/* Nombre traducido */}
          </Link>
        );
      })}
    </nav>
  );
}
