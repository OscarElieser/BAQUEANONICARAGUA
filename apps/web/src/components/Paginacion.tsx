import Link from 'next/link'; // Enlaces internos
import { t } from '@/i18n/t'; // Textos traducidos

/** Navegación entre páginas de resultados. Son enlaces reales (los buscadores los siguen) y funcionan sin JavaScript. */
export function Paginacion({ locale, prevHref, nextHref, page }: { locale: string; prevHref?: string; nextHref?: string; page?: number }) {
  if (!prevHref && !nextHref) return null; // Una sola página: no hace falta
  const pill = 'flex h-11 items-center rounded-pill border-[1.5px] border-control-border px-5 font-bold text-ink no-underline'; // Estilo de los enlaces
  return (
    <nav aria-label={t(locale, 'pagination.aria')} className="mt-6 flex flex-wrap items-center gap-3">
      {prevHref && (
        <Link href={prevHref} rel="prev" className={pill}>
          {t(locale, 'pagination.prev')} {/* Página anterior */}
        </Link>
      )}
      {page != null && <span className="text-ink-muted" aria-current="page">{t(locale, 'pagination.page', { n: page })}</span>} {/* Página actual */}
      {nextHref && (
        <Link href={nextHref} rel="next" className={pill}>
          {t(locale, 'pagination.next')} {/* Página siguiente */}
        </Link>
      )}
    </nav>
  );
}
