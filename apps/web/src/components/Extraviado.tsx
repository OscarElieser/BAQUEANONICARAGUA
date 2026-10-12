'use client'; // Lee el idioma de la dirección (la página 404 no recibe parámetros)

import Link from 'next/link'; // Enlaces internos
import { usePathname } from 'next/navigation'; // Dirección actual
import { defaultLocale, locales } from '@/i18n/config'; // Idiomas disponibles
import { t } from '@/i18n/t'; // Textos traducidos

/** Idioma tomado del primer tramo de la dirección (o español si no es uno de los 10). */
export function useIdiomaDeRuta(): string {
  const seg = (usePathname() ?? '').split('/')[1] ?? ''; // Primer tramo: /es/…, /en/…
  return (locales as readonly string[]).includes(seg) ? seg : defaultLocale; // Idioma válido o el de por defecto
}

/** Ilustración de neblina sobre curvas de nivel, con un sendero punteado que se pierde. Decorativa. */
function Neblina() {
  return (
    <svg viewBox="0 0 600 360" className="block h-auto w-full" aria-hidden="true" focusable="false">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx="390" cy="200" rx={60 + i * 42} ry={34 + i * 24} fill="none" stroke="var(--oro)" strokeOpacity={0.75 - i * 0.11} strokeWidth="1.5" /> // Curva de nivel
      ))}
      <path d="M20 330 C120 300 140 250 210 240 S300 260 330 215" fill="none" stroke="var(--ink)" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" /> {/* Sendero que se pierde */}
      <circle cx="330" cy="215" r="7" fill="var(--terracota)" /> {/* Aquí se perdió el rastro */}
      <rect className="neblina-banda" x="-200" y="120" width="520" height="70" rx="35" fill="var(--ground)" opacity="0.72" /> {/* Banda de neblina */}
      <rect className="neblina-banda lenta" x="260" y="230" width="460" height="60" rx="30" fill="var(--ground)" opacity="0.6" /> {/* Otra banda, más lenta */}
    </svg>
  );
}

/** Página "no encontrado": dice qué pasó y ofrece dos caminos reales. */
export function Extraviado() {
  const locale = useIdiomaDeRuta(); // Idioma de la página
  return (
    <main className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-14 sm:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <h1 className="m-0 font-display text-[44px] font-normal leading-[1] sm:text-[72px]">{t(locale, 'notfound.title')}</h1> {/* Qué pasó */}
        <p className="mb-0 mt-5 max-w-[46ch] text-[19px] leading-[30px] text-ink-muted">{t(locale, 'notfound.body')}</p> {/* Por qué puede pasar */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${locale}`} className="flex h-[52px] items-center rounded-pill bg-oro px-7 font-bold text-on-oro no-underline">
            {t(locale, 'notfound.home')} {/* Camino principal */}
          </Link>
          <Link href={`/${locale}/mapa`} className="flex h-[52px] items-center rounded-pill border-[1.5px] border-control-border px-7 font-bold text-ink no-underline">
            {t(locale, 'notfound.map')} {/* Camino alterno */}
          </Link>
        </div>
      </div>
      <Neblina /> {/* Ilustración */}
    </main>
  );
}
