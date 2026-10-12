'use client'; // El botón de preferencias de cookies funciona en el navegador

import Link from 'next/link'; // Enlaces internos
import { openConsentPanel } from '@/lib/consent'; // Abre el panel de cookies

const LINKS = [
  { slug: 'sobre-nosotros', label: 'Sobre nosotros' }, // Quiénes somos
  { slug: 'contacto', label: 'Contacto' }, // Canales
  { slug: 'privacidad', label: 'Privacidad' }, // Aviso de privacidad
  { slug: 'cookies', label: 'Cookies' }, // Cookies y almacenamiento
  { slug: 'terminos', label: 'Términos de uso' }, // Reglas de uso
  { slug: 'accesibilidad', label: 'Accesibilidad' }, // Compromiso de accesibilidad
]; // Páginas institucionales y legales

/** Pie de página común: páginas legales, preferencias de cookies y teléfonos de emergencia. */
export function SiteFooter({ locale }: { locale: string }) {
  return (
    <footer className="mx-auto mt-16 max-w-[1280px] border-t border-line px-4 pb-24 pt-8 sm:px-12">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <nav aria-label="Información legal">
          <ul className="m-0 grid list-none grid-cols-2 gap-x-8 gap-y-2 p-0 sm:grid-cols-3">
            {LINKS.map((l) => (
              <li key={l.slug}>
                <Link href={`/${locale}/${l.slug}`} className="text-ink no-underline hover:text-accent hover:underline">
                  {l.label} {/* Enlace a la página */}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={openConsentPanel} className="p-0 text-left text-ink hover:text-accent hover:underline">
                Preferencias de cookies {/* Reabre el aviso para cambiar la elección */}
              </button>
            </li>
          </ul>
        </nav>
        <p className="m-0 max-w-[36ch] text-[15px] text-ink-muted">
          ¿Hay peligro ahora? Llama al <a href="tel:118">118</a> (Policía), al <a href="tel:115">115</a> (Bomberos) o al{' '}
          <a href="tel:128">128</a> (Cruz Roja). {/* Teléfonos oficiales de emergencia */}
        </p>
      </div>
    </footer>
  );
}
