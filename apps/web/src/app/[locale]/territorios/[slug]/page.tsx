import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CurvasDeNivel } from '@/components/CurvasDeNivel';
import { EstadoVerificacion } from '@/components/EstadoVerificacion';
import { getTerritory } from '@/lib/territories';
import { t } from '@/i18n/t'; // Textos traducidos

export const revalidate = 3600;

const sectionOrder = [
  'overview', 'geography', 'history', 'culture', 'gastronomy', 'peoples',
  'nature', 'heritage', 'festivities', 'climate', 'transport', 'routes', 'community',
];

export default async function TerritoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const { territory, sections } = await getTerritory(slug, locale);
  if (!territory) notFound();

  const sorted = [...sections].sort((a, b) => sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section));
  const source = (territory as { data_sources?: { url?: string } | null }).data_sources?.url;

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
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
