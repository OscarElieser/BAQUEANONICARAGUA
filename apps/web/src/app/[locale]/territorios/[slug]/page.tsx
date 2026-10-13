import Link from 'next/link';
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Foto real del territorio, si existe
import { SpriteMapa } from '@/components/SpriteMapa'; // Formas del mapa (las portadas las reutilizan)
import { notFound } from 'next/navigation';
import { CurvasDeNivel } from '@/components/CurvasDeNivel'; // Curvas genéricas (si el territorio no está en el mapa)
import { RelieveTerritorio3D } from '@/components/RelieveTerritorio3D'; // Relieve 3D de su silueta real
import { ZONA_TEXTO, territorio } from '@/lib/portadas'; // Forma y zona de cada territorio
import { EstadoVerificacion } from '@/components/EstadoVerificacion';
import { getTerritory } from '@/lib/territories';
import { t } from '@/i18n/t'; // Textos traducidos
import { letraMarca } from '@/app/fuentes'; // Letra de la marca para el titular
import type { Metadata } from 'next'; // Tipo de los metadatos
import { absolute, jsonLd, pageMetadata } from '@/lib/seo'; // Canónica, idiomas, vista previa y datos estructurados

export const revalidate = 3600;

const sectionOrder = [
  'overview', 'geography', 'history', 'culture', 'gastronomy', 'peoples',
  'nature', 'heritage', 'festivities', 'climate', 'transport', 'routes', 'community',
];

/** Metadatos de la ficha de territorio (nombre real y descripción traducida). */
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params; // Idioma y territorio
  const { territory } = await getTerritory(slug, locale); // Datos publicados
  if (!territory) return {}; // No existe: la página dará 404
  return pageMetadata(locale, `/territorios/${slug}`, territory.name, t(locale, 'territory.meta_desc', { name: territory.name })); // Metadatos
}

export default async function TerritoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const { territory, sections } = await getTerritory(slug, locale);
  if (!territory) notFound();

  const forma = territorio(slug); // Silueta y zona en el mapa ilustrado (si existe)
  const sorted = [...sections].sort((a, b) => sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section));
  const source = (territory as { data_sources?: { url?: string } | null }).data_sources?.url;

  const structured = {
    '@context': 'https://schema.org', // Vocabulario de datos estructurados
    '@type': 'AdministrativeArea', // Departamento o región autónoma
    name: territory.name, // Nombre oficial
    url: absolute(locale, `/territorios/${slug}`), // Dirección de la ficha
    containedInPlace: { '@type': 'Country', name: 'Nicaragua' }, // País
  }; // Datos estructurados del territorio (solo datos reales)
  return (
    <main className={`${letraMarca.variable} mx-auto max-w-[1280px] px-4 pb-16 sm:px-12`}>
      <SpriteMapa /> {/* Formas del mapa para la portada */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} /> {/* Datos para buscadores */}
      <nav aria-label={t(locale, 'nav.breadcrumb')} className="pt-6 text-sm">
        <ol className="miga m-0 flex list-none flex-wrap gap-x-2 p-0">
          <li><Link href={`/${locale}`}>{t(locale, 'nav.discover')}</Link></li> {/* Portada */}
          <li><Link href={`/${locale}/territorios`}>{t(locale, 'terr.title')}</Link></li> {/* Catálogo de los 17 */}
          <li aria-current="page">{territory.name}</li> {/* Página actual */}
        </ol>
      </nav>

      {fotoDe(slug) && (
        <figure className="relative m-0 mt-4 overflow-hidden rounded-[var(--radius-m)]">
          <img src={fotoDe(slug)!.imagen} srcSet={srcsetDe(fotoDe(slug)!)} sizes="(min-width: 1280px) 1180px, 100vw" alt={fotoDe(slug)!.lugar} width={1600} height={fotoDe(slug)!.alto} fetchPriority="high" decoding="async" className="block aspect-[4/3] h-auto w-full object-cover sm:aspect-[21/9]" /> {/* Foto real del territorio */}
          <figcaption className="foto-pie absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-5 pb-4 pt-24 sm:px-10 sm:pb-6">
            <span className="min-w-0">
              {forma && <span className="block text-[15px] font-bold opacity-90">{t(locale, ZONA_TEXTO[forma.zone])}</span>} {/* Zona de paisaje */}
              <h1 className="terr-ficha-titulo m-0">{territory.name}</h1> {/* Nombre, titular único de la página */}
              <span className="mt-1 block text-[14px] opacity-90">{fotoDe(slug)!.lugar}</span> {/* Lugar de la foto */}
            </span>
            <a href={fotoDe(slug)!.pagina} target="_blank" rel="noopener noreferrer" className="text-[12px] underline">{t(locale, 'photo.credit', { author: fotoDe(slug)!.autor, license: fotoDe(slug)!.licencia })}</a> {/* Crédito */}
          </figcaption>
        </figure>
      )}

      {forma ? (
        <header className={`heroe-territorio zona-${forma.zone} mt-4 grid items-center gap-6 rounded-[var(--radius-m)] p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]`}>
          {/* Portada del territorio con el color de su zona: el nombre a un lado, su relieve al otro */}
          <div className="min-w-0">
            {!fotoDe(slug) && (
              <>
                <p className="m-0 text-[15px] font-bold text-ink-muted">{t(locale, ZONA_TEXTO[forma.zone])}</p> {/* Zona de paisaje */}
                <h1 className="m-0 mt-2 mb-6 font-display text-[44px] font-normal leading-[0.98] sm:text-[76px]">{territory.name}</h1> {/* Nombre (sin foto, el titular va aquí) */}
              </>
            )}
            <h2 className="m-0 font-display text-[26px] font-normal">{t(locale, 'terr.general')}</h2> {/* "Información general" */}
            <dl className="datos-generales m-0 mt-4">
              <div><dt>{t(locale, 'terr.type_label')}</dt><dd>{t(locale, slug.startsWith('costa-caribe') ? 'index.region' : 'index.department')}</dd></div> {/* Departamento o región autónoma */}
              <div><dt>{t(locale, 'terr.capital_label')}</dt><dd>{territory.capital_name ?? t(locale, 'ficha.unconfirmed')}</dd></div> {/* Cabecera, del catálogo oficial */}
              <div><dt>{t(locale, 'terr.zone_label')}</dt><dd>{t(locale, ZONA_TEXTO[forma.zone])}</dd></div> {/* Zona de paisaje (agrupación de BAQUEANO) */}
              <div><dt>{t(locale, 'terr.pending_facts')}</dt><dd className="text-oro-text">{t(locale, 'ficha.unconfirmed')}</dd></div> {/* Aún sin fuente comprobada */}
            </dl>
          </div>
          <figure className="m-0 min-w-0">
            <RelieveTerritorio3D slug={slug} name={territory.name} locale={locale} /> {/* Relieve que crece al llegar y se gira con el dedo */}
            <figcaption className="mt-2 text-[14px] text-ink-muted">{t(locale, 'relief.territory_note')}</figcaption> {/* Aclara que las alturas son ilustrativas */}
          </figure>
        </header>
      ) : (
        <header className="flex flex-wrap items-end gap-6 pt-4">
          {/* Territorio sin forma en el mapa: encabezado sencillo */}
          <div className="min-w-0 flex-[1_1_420px]">
            {!fotoDe(slug) && <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02] sm:text-[48px]">{territory.name}</h1>} {/* Nombre (si hay foto, ya va sobre ella) */}
            {territory.capital_name && <p className="mt-2 text-ink-muted">{t(locale, 'territory.capital', { name: territory.capital_name })}</p>} {/* Cabecera */}
          </div>
          <CurvasDeNivel className="h-auto w-full max-w-[360px] flex-[0_1_360px]" /> {/* Curvas decorativas */}
        </header>
      )}

      {sorted.length > 1 && (
        <nav aria-label={t(locale, 'terr.sections')} className="pestanas-ficha mt-8">
          {/* Atajos a cada sección publicada de la ficha */}
          {sorted.map((sec) => (
            <a key={sec.section} href={`#sec-${sec.section}`}>{sec.title}</a> // Salta a la sección
          ))}
        </nav>
      )}

      <div className="mt-8 flex flex-wrap gap-10">
        <div className="min-w-0 max-w-[var(--measure)] flex-[999_1_560px]">
          {sorted.length === 0 ? (
            <p className="text-ink-muted">
              {t(locale, 'territory.no_content')} {/* Sin secciones en este idioma */}
            </p>
          ) : (
            sorted.map((s) => (
              <section key={s.section} id={`sec-${s.section}`} className="mb-10 scroll-mt-24">
                <h2 className="mb-3 font-display text-[28px] font-normal">{s.title}</h2>
                {s.machine_translated && <p className="text-sm text-oro-text">{t(locale, 'territory.machine')}</p>}
                {/* body_md se renderiza con un parser Markdown sanitizado (pendiente de elegir en Fase 3) */}
                <div className="whitespace-pre-line text-[17px] leading-[28px]">{s.body_md}</div>
              </section>
            ))
          )}
        </div>
        <aside className="min-w-0 flex-[1_1_300px]">
          <EstadoVerificacion
            locale={locale}
            sourceHref={source}
            rows={[
              { field: 'field.boundaries', state: { kind: 'pending' } }, // Límites: sin capa oficial todavía
              { field: 'field.editorial', state: sorted.some((s) => s.verified_at) ? { kind: 'verified', date: sorted.find((s) => s.verified_at)!.verified_at! } : { kind: 'unconfirmed' } },
            ]}
          />
        </aside>
      </div>
    </main>
  );
}
