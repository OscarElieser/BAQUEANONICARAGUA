import Link from 'next/link';
import { RelieveVivo3D } from '@/components/RelieveVivo3D'; // Relieve 3D "Relieve vivo"
import { listTerritories } from '@/lib/territories'; // Territorios publicados desde Supabase
import { MapaTerritorios } from '@/components/MapaTerritorios'; // Mapa ilustrado de los 17 territorios
import { GaleriaTerritorios } from '@/components/GaleriaTerritorios'; // Galería en arco de las 17 portadas
import { ExploradorTerritorios } from '@/components/ExploradorTerritorios'; // Explorador a pantalla completa
import { ModosExplorar } from '@/components/ModosExplorar'; // Seis caminos con fotos reales
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
          <MapaTerritorios
            locale={locale} // Idioma
            published={(territories ?? []).map((ter) => ter.slug)} // Solo los publicados son enlaces
            territories={formas.map(({ slug, name, label, zone }) => ({ slug, name, label, zone }))} // Nombres, etiquetas y zona (las formas vienen del sprite)
            lakes={lagos.map((l) => l.id)} // Lagos
            viewBox={VIEWBOX_MAPA} // Lienzo
          />
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
