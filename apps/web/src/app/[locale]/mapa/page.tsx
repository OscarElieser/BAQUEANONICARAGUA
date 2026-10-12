import Link from 'next/link';
import { MapaExplorer } from '@/components/MapaExplorer';
import { publicDb } from '@/lib/territories';

type Result = { kind: 'destination' | 'business'; id: string; slug: string; name: string; summary: string | null };

export default async function Mapa({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; departamento?: string }>;
}) {
  const { locale } = await params;
  const { q, departamento } = await searchParams;
  const term = q?.trim().slice(0, 80) || null;
  const dept = departamento ? Number(departamento) : null;

  const { data, error } = await publicDb().rpc('search_catalog', {
    q: term,
    p_department: dept && dept >= 1 && dept <= 17 ? dept : null,
    p_limit: 30,
  });
  const results = (data ?? []) as Result[];

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
      <h1 className="mb-2 mt-8 font-display text-[40px] font-normal leading-[1.02]">{term ? `Resultados para “${term}”` : 'Explorar el mapa'}</h1>
      <form role="search" className="mb-8 flex flex-wrap gap-2">
        <label htmlFor="q" className="visually-hidden">Buscar</label>
        <input id="q" name="q" type="search" defaultValue={term ?? ''} placeholder="Un volcán, un pueblo, un plato…"
          className="h-[52px] min-w-0 flex-[1_1_240px] rounded-pill border border-control-border bg-ground-raised px-[22px] text-base text-ink" />
        <button type="submit" className="h-[52px] rounded-pill bg-oro px-[26px] font-bold text-on-oro">Buscar</button>
      </form>

      <div className="flex flex-wrap gap-8">
        <section aria-labelledby="resultados" className="min-w-0 flex-[1_1_320px]">
          <h2 id="resultados" className="visually-hidden">Resultados</h2>
          {error && <p role="alert" className="text-status-alert">No se pudo completar la búsqueda. Intenta de nuevo.</p>}
          {!error && results.length === 0 && (
            <p className="text-ink-muted">
              {term ? 'No encontramos lugares publicados con ese nombre. Prueba con otra palabra o con el nombre del municipio.' : 'Todavía no hay lugares publicados. El catálogo crece a medida que se verifican las fuentes.'}
            </p>
          )}
          <ul className="m-0 list-none p-0">
            {results.map((r) => (
              <li key={r.id} className="border-b border-line py-3">
                <Link href={`/${locale}/${r.kind === 'business' ? 'negocios' : 'destinos'}/${r.slug}`} className="text-[17px] font-bold text-ink no-underline hover:text-accent">
                  {r.name}
                </Link>
                <p className="m-0 text-sm text-ink-muted">{r.kind === 'business' ? 'Emprendimiento' : 'Destino'}{r.summary ? `. ${r.summary}` : ''}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-muted">Orden: relevancia; entre resultados igual de relevantes el orden rota cada día. Nadie paga por aparecer aquí.</p>
        </section>
        <div className="min-w-0 flex-[2_1_480px]">
          <MapaExplorer locale={locale} />
        </div>
      </div>
    </main>
  );
}
