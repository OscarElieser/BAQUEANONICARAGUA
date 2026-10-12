'use client'; // Interactiva: se puede pausar

import { useState } from 'react'; // Estado de pausa
import { TarjetaTerritorio } from './TarjetaTerritorio'; // Tarjeta de cada territorio
import { territorios } from '@/lib/portadas'; // Los 17 territorios
import { t } from '@/i18n/t'; // Textos traducidos

/**
 * Desfile de las 17 portadas que avanza despacio. Se detiene al pasar el cursor, al llegar con el teclado
 * o con el botón (WCAG 2.2.2). Con "reducir movimiento" no se mueve: queda como fila que se desliza a mano.
 */
export function GaleriaTerritorios({ locale, published }: { locale: string; published: string[] }) {
  const [pausa, setPausa] = useState(false); // Si la persona lo detuvo

  return (
    <section aria-labelledby="galeria" className="py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[60ch]">
          <h2 id="galeria" className="m-0 font-display text-[34px] font-normal leading-tight">
            {t(locale, 'gallery.title')} {/* Título */}
          </h2>
          <p className="m-0 mt-2 text-ink-muted">{t(locale, 'gallery.intro')}</p> {/* Aclara que son ilustraciones, no fotos */}
        </div>
        <button
          type="button" // No envía formularios
          onClick={() => setPausa((p) => !p)} // Alterna pausa y movimiento
          className="desfile-control min-h-[44px] rounded-pill border border-control-border bg-transparent px-5 text-[15px] font-bold text-ink" // Botón secundario
        >
          {t(locale, pausa ? 'gallery.play' : 'gallery.pause')} {/* Lo que hará al pulsarlo */}
        </button>
      </div>
      <div className="desfile" data-pausa={pausa} role="region" aria-label={t(locale, 'gallery.label')}>
        <div className="desfile-carril">
          <ul className="desfile-lista">
            {/* Las 17 tarjetas reales (enlaces si tienen ficha) */}
            {territorios.map((ter) => (
              <li key={ter.slug} className="w-[208px] shrink-0">
                <TarjetaTerritorio locale={locale} slug={ter.slug} name={ter.name} zone={ter.zone} published={published.includes(ter.slug)} uid="g" /> {/* Tarjeta */}
              </li>
            ))}
          </ul>
          <ul className="desfile-lista desfile-eco" aria-hidden="true">
            {/* Copia solo visual para que el desfile no tenga fin (sin enlaces ni foco) */}
            {territorios.map((ter) => (
              <li key={ter.slug} className="w-[208px] shrink-0">
                <TarjetaTerritorio locale={locale} slug={ter.slug} name={ter.name} zone={ter.zone} published={published.includes(ter.slug)} uid="eco" interactive={false} /> {/* Copia */}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
