import Link from 'next/link';
import { MapaExplorer } from '@/components/MapaExplorer';
import { publicDb } from '@/lib/territories'; // Acceso público a la base de datos
import { t } from '@/i18n/t'; // Textos traducidos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { Paginacion } from '@/components/Paginacion'; // Anterior / siguiente
import { pageMetadata } from '@/lib/seo'; // Canónica, idiomas y vista previa

const PER_PAGE = 30; // Resultados por página

/** Solo la primera página sin búsqueda se indexa; las búsquedas y páginas siguientes no, pero sus enlaces sí se siguen. */
export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; pagina?: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  const { q, pagina } = await searchParams; // Búsqueda y página
  const thin = Boolean(q?.trim()) || Number(pagina ?? '1') > 1; // Resultados de búsqueda o páginas siguientes
  return pageMetadata(locale, '/mapa', t(locale, 'home.search_button'), t(locale, 'home.sources'), { noindex: thin }); // Metadatos
}

type Result = { kind: 'destination' | 'business'; id: string; slug: string; name: string; summary: string | null };

export default async function Mapa({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; departamento?: string; pagina?: string }>;
}) {
  const { locale } = await params;
  const { q, departamento, pagina } = await searchParams; // Búsqueda, territorio y página
  const page = Math.min(Math.max(Number.parseInt(pagina ?? '1', 10) || 1, 1), 100); // Página entre 1 y 100
  const term = q?.trim().slice(0, 80) || null;
  const dept = departamento ? Number(departamento) : null;

  const { data, error } = await publicDb().rpc('search_catalog', {
    q: term,
    p_department: dept && dept >= 1 && dept <= 17 ? dept : null,
    p_limit: PER_PAGE + 1, // Uno de más para saber si hay página siguiente
    p_offset: (page - 1) * PER_PAGE, // Salta las páginas anteriores
  });
  const all = (data ?? []) as Result[]; // Resultados recibidos
  const hasNext = all.length > PER_PAGE; // Si hay más resultados
  const results = all.slice(0, PER_PAGE); // Los de esta página
  const href = (n: number) => `/${locale}/mapa?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(dept ? { departamento: String(dept) } : {}), ...(n > 1 ? { pagina: String(n) } : {}) })}`; // Dirección de otra página con la misma búsqueda

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
      <h1 className="mb-2 mt-8 font-display text-[40px] font-normal leading-[1.02]">{term ? t(locale, 'search.results_for', { q: term }) : t(locale, 'home.search_button')}</h1>
      <form role="search" className="mb-8 flex flex-wrap gap-2">
        <label htmlFor="q" className="visually-hidden">{t(locale, 'discover.search_button')}</label>
        <input id="q" name="q" type="search" defaultValue={term ?? ''} placeholder={t(locale, 'home.search_placeholder')}
          className="h-[52px] min-w-0 flex-[1_1_240px] rounded-pill border border-control-border bg-ground-raised px-[22px] text-base text-ink" />
        <button type="submit" className="h-[52px] rounded-pill bg-oro px-[26px] font-bold text-on-oro">{t(locale, 'discover.search_button')}</button>
      </form>

      <div className="flex flex-wrap gap-8">
        <section aria-labelledby="resultados" className="min-w-0 flex-[1_1_320px]">
          <h2 id="resultados" className="visually-hidden">{t(locale, 'map.results')}</h2>
          {error && <p role="alert" className="text-status-alert">{t(locale, 'map.error')}</p>}
          {!error && results.length === 0 && (
            <p className="text-ink-muted">
              {term ? t(locale, 'map.empty_query') : t(locale, 'map.empty')}
            </p>
          )}
          <ul className="m-0 list-none p-0">
            {results.map((r) => (
              <li key={r.id} className="border-b border-line py-3">
                <Link href={`/${locale}/${r.kind === 'business' ? 'negocios' : 'destinos'}/${r.slug}`} className="text-[17px] font-bold text-ink no-underline hover:text-accent">
                  {r.name}
                </Link>
                <p className="m-0 text-sm text-ink-muted">{r.kind === 'business' ? t(locale, 'search.business') : t(locale, 'search.destination')}{r.summary ? `. ${r.summary}` : ''}</p>
              </li>
            ))}
          </ul>
          <Paginacion locale={locale} page={page} prevHref={page > 1 ? href(page - 1) : undefined} nextHref={hasNext ? href(page + 1) : undefined} /> {/* Anterior / siguiente */}
          <p className="mt-4 text-sm text-ink-muted">{t(locale, 'map.order_note')}</p>
        </section>
        <div className="min-w-0 flex-[2_1_480px]">
          <MapaExplorer locale={locale} />
        </div>
      </div>
    </main>
  );
}
