import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CurvasDeNivel } from '@/components/CurvasDeNivel';
import { EstadoVerificacion } from '@/components/EstadoVerificacion';
import { getTerritory } from '@/lib/territories';
import { t } from '@/i18n/t'; // Textos traducidos
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
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} /> {/* Datos para buscadores */}
      <nav aria-label={t(locale, 'nav.breadcrumb')} className="pt-6 text-sm">
        <Link href={`/${locale}`}>{t(locale, 'nav.discover')}</Link>
      </nav>

      <header className="flex flex-wrap items-end gap-6 pt-4">
        <div className="min-w-0 flex-[1_1_420px]">
          <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02] sm:text-[48px]">{territory.name}</h1>
          {territory.capital_name && <p className="mt-2 text-ink-muted">{t(locale, 'territory.capital', { name: territory.capital_name })}</p>}
        </div>
        <CurvasDeNivel className="h-auto w-full max-w-[360px] flex-[0_1_360px]" />
      </header>

      <div className="mt-8 flex flex-wrap gap-10">
        <div className="min-w-0 max-w-[var(--measure)] flex-[999_1_560px]">
          {sorted.length === 0 ? (
            <p className="text-ink-muted">
              {t(locale, 'territory.no_content')} {/* Sin secciones en este idioma */}
            </p>
          ) : (
            sorted.map((s) => (
              <section key={s.section} className="mb-10">
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
