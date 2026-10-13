'use client'; // El botón de preferencias de cookies funciona en el navegador

import Link from 'next/link'; // Enlaces internos
import { Fragment } from 'react'; // Agrupar trozos del texto de emergencias
import { needsReview, t, tParts, type MessageKey } from '@/i18n/t'; // Textos traducidos
import { openConsentPanel } from '@/lib/consent'; // Abre el panel de cookies

const LINKS: Array<{ slug: string; label: MessageKey }> = [
  { slug: 'sobre-nosotros', label: 'footer.about' }, // Quiénes somos
  { slug: 'contacto', label: 'footer.contact' }, // Canales
  { slug: 'ayuda', label: 'footer.help' }, // Centro de ayuda
  { slug: 'privacidad', label: 'footer.privacy' }, // Aviso de privacidad
  { slug: 'cookies', label: 'footer.cookies' }, // Cookies y almacenamiento
  { slug: 'terminos', label: 'footer.terms' }, // Reglas de uso
  { slug: 'accesibilidad', label: 'footer.accessibility' }, // Compromiso de accesibilidad
]; // Páginas institucionales y legales

/** Pie de página común: páginas legales, preferencias de cookies, teléfonos de emergencia y aviso de traducción. */
export function SiteFooter({ locale }: { locale: string }) {
  return (
    <footer className="mx-auto mt-16 max-w-[1280px] border-t border-line px-4 pb-24 pt-8 sm:px-12">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <nav aria-label={t(locale, 'footer.legal_nav')}>
          <ul className="m-0 grid list-none grid-cols-2 gap-x-8 gap-y-2 p-0 sm:grid-cols-3">
            {LINKS.map((l) => (
              <li key={l.slug}>
                <Link href={`/${locale}/${l.slug}`} className="text-ink no-underline hover:text-accent hover:underline">
                  {t(locale, l.label)} {/* Enlace a la página */}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={openConsentPanel} className="p-0 text-left text-ink hover:text-accent hover:underline">
                {t(locale, 'footer.cookie_prefs')} {/* Reabre el aviso para cambiar la elección */}
              </button>
            </li>
          </ul>
        </nav>
        <p className="m-0 max-w-[36ch] text-[15px] text-ink-muted">
          {tParts(locale, 'footer.emergency').map((part, i) => (
            <Fragment key={i}>
              {'slot' in part ? <a href={`tel:${part.slot}`}>{part.slot}</a> : part.text} {/* Número como enlace de llamada o texto */}
            </Fragment>
          ))}
        </p>
      </div>
      {needsReview(locale) && (
        <p className="mt-6 text-[14px] text-ink-muted">{t(locale, 'lang.ui_review')}</p> // Aviso honesto de traducción sin revisar
      )}
    </footer>
  );
}
