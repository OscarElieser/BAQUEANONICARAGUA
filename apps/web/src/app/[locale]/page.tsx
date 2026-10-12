import Link from 'next/link';
import { RelieveVivo3D } from '@/components/RelieveVivo3D'; // Relieve 3D "Relieve vivo"
import { listTerritories } from '@/lib/territories'; // Territorios publicados desde Supabase
import { MapaTerritorios } from '@/components/MapaTerritorios'; // Mapa ilustrado de los 17 territorios
import { GaleriaTerritorios } from '@/components/GaleriaTerritorios'; // Desfile de las 17 portadas
import { PuertaCultura } from '@/components/PuertaCultura'; // Puerta al mundo de Cultura
import { t } from '@/i18n/t'; // Textos traducidos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { jsonLd, pageMetadata, SITE_URL, absolute } from '@/lib/seo'; // Canónica, idiomas, vista previa y datos estructurados

export const revalidate = 3600;

/** Metadatos de la portada en el idioma de la página. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return pageMetadata(locale, '', t(locale, 'meta.title_default'), t(locale, 'meta.description')); // Canónica y versiones por idioma
}

export default async function Descubrir({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { data: territories, error } = await listTerritories();

  const site = {
    '@context': 'https://schema.org', // Vocabulario de datos estructurados
    '@type': 'WebSite', // Es un sitio web
    url: absolute(locale), // Dirección de la portada en este idioma
    name: t(locale, 'meta.title_default'), // Nombre visible
    inLanguage: locale, // Idioma
    potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/${locale}/mapa?q={search_term_string}`, 'query-input': 'required name=search_term_string' }, // Buscador del sitio (Google puede mostrarlo en sus resultados)
  }; // Datos estructurados del sitio
  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} /> {/* Datos para buscadores */}
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

      <GaleriaTerritorios locale={locale} published={(territories ?? []).map((ter) => ter.slug)} /> {/* Las 17 portadas en movimiento */}

      <PuertaCultura locale={locale} /> {/* Historia, arte y cultura */}

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
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Mapa ilustrado a la izquierda, lista accesible a la derecha (en el teléfono, uno debajo del otro) */}
          <MapaTerritorios locale={locale} published={(territories ?? []).map((ter) => ter.slug)} /> {/* Solo los publicados son enlaces */}
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-6 gap-y-0.5 p-0">
            {/* Lista de territorios publicados (misma información que el mapa, en texto) */}
            {territories.map((ter) => (
              <li key={ter.id}>
                <Link
                  href={`/${locale}/territorios/${ter.slug}`} // Ficha del territorio
                  className="block border-b border-line py-2.5 text-[17px] text-ink no-underline hover:text-accent" // Fila con línea inferior
                >
                  {ter.kind === 'autonomous_region' ? ter.name.replace('Región Autónoma de la ', '') : ter.name} {/* Nombre corto para las regiones autónomas */}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
