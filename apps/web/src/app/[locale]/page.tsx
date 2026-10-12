import Link from 'next/link';
import { RelieveVivo3D } from '@/components/RelieveVivo3D'; // Relieve 3D "Relieve vivo"
import { listTerritories } from '@/lib/territories';
import { t } from '@/i18n/t'; // Textos traducidos

export const revalidate = 3600;

export default async function Descubrir({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { data: territories, error } = await listTerritories();

  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-12">
      <section className="flex flex-wrap items-center gap-6 pb-2 pt-10">
        <div className="min-w-0 max-w-[520px] flex-[1_1_420px]">
          <h1 className="m-0 font-display text-[44px] font-normal leading-[0.98] tracking-[-0.01em] sm:text-[76px]">
            {t(locale, 'home.title')} {/* Título */}
          </h1>
          <p className="mt-6 max-w-[34ch] text-[19px] leading-[30px] text-ink-muted">
            {t(locale, 'home.intro')} {/* Presentación */}
          </p>
          <form role="search" action={`/${locale}/mapa`} className="mt-8 flex flex-wrap gap-2">
            <label htmlFor="buscar" className="visually-hidden">
              {t(locale, 'home.search_label')} {/* Nombre accesible del buscador */}
            </label>
            <input
              id="buscar"
              name="q"
              type="search"
              placeholder={t(locale, 'home.search_placeholder')} // Ejemplos de búsqueda
              className="h-[52px] min-w-0 flex-[1_1_240px] rounded-pill border border-control-border bg-ground-raised px-[22px] text-base text-ink placeholder:text-ink-muted"
            />
            <button type="submit" className="h-[52px] rounded-pill bg-oro px-[26px] text-base font-bold text-on-oro">
              {t(locale, 'home.search_button')} {/* Botón */}
            </button>
          </form>
        </div>

        <figure className="relative m-0 min-w-0 flex-[1_1_520px]">
          <RelieveVivo3D className="block h-auto w-full" locale={locale} /> {/* Relieve 3D interactivo (con versión ligera automática) */}
          <figcaption className="absolute bottom-[4%] left-[6%] flex flex-col gap-1.5">
            <span className="font-display text-[26px]">Isla de Ometepe</span>
            <span className="text-sm text-ink-muted">{t(locale, 'home.figure_note')}</span>
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="territorios" className="border-t border-line pb-10 pt-7">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="territorios" className="m-0 font-display text-[28px] font-normal">
            {t(locale, 'home.choose')} {/* Título de la lista */}
          </h2>
          <p className="m-0 text-sm text-ink-muted">{t(locale, 'home.sources')}</p>
        </div>

        {error && (
          <p role="alert" className="text-status-alert">
            {t(locale, 'home.error')} {/* Error claro */}
          </p>
        )}
        {!error && territories.length === 0 && (
          <p className="text-ink-muted">
            {t(locale, 'home.empty')} {/* Aún nada publicado */}
          </p>
        )}
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-6 gap-y-0.5 p-0">
          {territories.map((t) => (
            <li key={t.id}>
              <Link
                href={`/${locale}/territorios/${t.slug}`}
                className="block border-b border-line py-2.5 text-[17px] text-ink no-underline hover:text-accent"
              >
                {t.kind === 'autonomous_region' ? t.name.replace('Región Autónoma de la ', '') : t.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
