// Se dibuja en el servidor; solo el botón de pausa es interactivo (ControlDesfile).
import { ControlDesfile } from './ControlDesfile'; // Botón de pausa
import { TarjetaTerritorio } from './TarjetaTerritorio'; // Tarjeta de cada territorio
import { territorios } from '@/lib/portadas'; // Los 17 territorios
import { t } from '@/i18n/t'; // Textos traducidos

/**
 * Desfile de las 17 portadas que avanza despacio. Se detiene al pasar el cursor, al llegar con el teclado
 * o con el botón (WCAG 2.2.2). Con "reducir movimiento" no se mueve: queda como fila que se desliza a mano.
 */
export function GaleriaTerritorios({ locale, published }: { locale: string; published: string[] }) {
  return (
    <section aria-labelledby="galeria" className="py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[60ch]">
          <h2 id="galeria" className="m-0 font-display text-[34px] font-normal leading-tight">
            {t(locale, 'gallery.title')} {/* Título */}
          </h2>
          <p className="m-0 mt-2 text-ink-muted">{t(locale, 'gallery.intro')}</p> {/* Aclara que son ilustraciones, no fotos */}
        </div>
        <ControlDesfile id="territorios" pausar={t(locale, 'gallery.pause')} reanudar={t(locale, 'gallery.play')} /> {/* Pausa (WCAG 2.2.2) */}
      </div>
      <div className="desfile" data-desfile="territorios" data-pausa="false" role="region" aria-label={t(locale, 'gallery.label')} tabIndex={0}> {/* Enfocable: con el teclado se detiene y, sin animación, se desliza con las flechas */}
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
