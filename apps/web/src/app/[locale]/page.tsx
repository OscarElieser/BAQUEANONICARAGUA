import { RelieveVivo3D } from '@/components/RelieveVivo3D'; // Relieve 3D "Relieve vivo"
import { listTerritories } from '@/lib/territories'; // Territorios publicados desde Supabase
import { MapaTerritorios } from '@/components/MapaTerritorios'; // Mapa ilustrado de los 17 territorios
import { GaleriaTerritorios } from '@/components/GaleriaTerritorios'; // Galería en arco de las 17 portadas
import { ExploradorTerritorios } from '@/components/ExploradorTerritorios'; // Explorador a pantalla completa
import { ModosExplorar } from '@/components/ModosExplorar'; // Seis caminos con fotos reales
import { IndiceTerritorios } from '@/components/IndiceTerritorios'; // Índice de los 17 con foto y estado
import { PuertaCultura } from '@/components/PuertaCultura'; // Puerta al mundo de Cultura
import { SpriteMapa } from '@/components/SpriteMapa'; // Formas del mapa, una sola vez por página
import { InclinacionTarjetas } from '@/components/InclinacionTarjetas'; // Inclinación 3D de las tarjetas
import { VIEWBOX_MAPA, lagos, territorios as formas } from '@/lib/portadas'; // Datos ligeros del mapa
import { t } from '@/i18n/t'; // Textos traducidos
import { PortadaBaqueano } from '@/components/PortadaBaqueano'; // Portada con ventana pintada
import { letraFirma, letraMarca } from '@/app/fuentes'; // Letras de la portada (Archivo y Kaushan Script)
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
    name: t(locale, 'brand.name'), // Nombre de la marca
    inLanguage: locale, // Idioma
    potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/${locale}/mapa?q={search_term_string}`, 'query-input': 'required name=search_term_string' }, // Buscador del sitio (Google puede mostrarlo en sus resultados)
  }; // Datos estructurados del sitio
  return (
    <main className={`${letraMarca.variable} ${letraFirma.variable} mx-auto max-w-[1280px] px-4 sm:px-12`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} /> {/* Datos para buscadores */}
      <PortadaBaqueano locale={locale} /> {/* Ventana pintada, eslogan, botones y buscador */}

      <ModosExplorar locale={locale} /> {/* Explora a tu manera: mapa, territorios, cultura, comunidad, viaje y negocios */}

      <SpriteMapa /> {/* Biblioteca de formas para portadas y mapa */}
      <ExploradorTerritorios locale={locale} published={(territories ?? []).map((ter) => ter.slug)} /> {/* Un territorio a pantalla completa, con los siguientes asomando */}

      <PuertaCultura locale={locale} /> {/* Historia, arte y cultura */}

      <InclinacionTarjetas /> {/* Las tarjetas se inclinan hacia el cursor */}
      <GaleriaTerritorios locale={locale} published={(territories ?? []).map((ter) => ter.slug)} /> {/* Las 17 portadas en arco 3D */}

      <figure className="relative m-0 border-t border-line pt-7">
        <RelieveVivo3D className="block h-auto w-full" locale={locale} /> {/* Relieve 3D interactivo (con versión ligera automática) */}
        <figcaption className="absolute bottom-[4%] left-[6%] flex flex-col gap-1.5">
          <span className="font-display text-[26px]">Isla de Ometepe</span> {/* Nombre del lugar del relieve */}
          <span className="text-sm text-ink-muted">{t(locale, 'home.figure_note')}</span> {/* Estado de la ficha */}
        </figcaption>
      </figure>

      <section aria-labelledby="territorios" className="border-t border-line pb-10 pt-7">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="territorios" className="cifra-territorios m-0">{t(locale, 'index.count')}</h2> {/* "17 territorios" (dato oficial: 15 departamentos y 2 regiones) */}
            <p className="m-0 text-[17px] text-ink-muted">{t(locale, 'index.count_detail')}</p> {/* "15 departamentos y 2 regiones autónomas" */}
          </div>
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
          <MapaTerritorios
            locale={locale} // Idioma
            published={(territories ?? []).map((ter) => ter.slug)} // Solo los publicados son enlaces
            territories={formas.map(({ slug, name, label, zone }) => ({ slug, name, label, zone }))} // Nombres, etiquetas y zona (las formas vienen del sprite)
            lakes={lagos.map((l) => l.id)} // Lagos
            viewBox={VIEWBOX_MAPA} // Lienzo
          />
          <div>
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="indice-titulo m-0">{t(locale, 'index.title')}</h3> {/* "Índice de territorios" */}
              <a href={`/${locale}/territorios`} className="text-[14px] font-bold text-accent">{t(locale, 'index.see_all')}</a> {/* Catálogo completo */}
            </div>
            <IndiceTerritorios locale={locale} items={formas.map(({ slug, name }) => ({ slug, name }))} published={(territories ?? []).map((ter) => ter.slug)} /> {/* Los 17 con foto y estado real */}
          </div>
        </div>
      </section>
    </main>
  );
}
