import Link from 'next/link';
import { CurvasDeNivel } from '@/components/CurvasDeNivel';
import { listTerritories } from '@/lib/territories';

export const revalidate = 3600;

export default async function Descubrir({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { data: territories, error } = await listTerritories();

  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-12">
      <section className="flex flex-wrap items-center gap-6 pb-2 pt-10">
        <div className="min-w-0 max-w-[520px] flex-[1_1_420px]">
          <h1 className="m-0 font-display text-[44px] font-normal leading-[0.98] tracking-[-0.01em] sm:text-[76px]">
            Nicaragua, curva por curva
          </h1>
          <p className="mt-6 max-w-[34ch] text-[19px] leading-[30px] text-ink-muted">
            Recorre los 17 territorios del país por su relieve: volcanes, lagunas, comunidades y la gente que te recibe en cada uno.
          </p>
          <form role="search" action={`/${locale}/mapa`} className="mt-8 flex flex-wrap gap-2">
            <label htmlFor="buscar" className="visually-hidden">
              Buscar en el mapa
            </label>
            <input
              id="buscar"
              name="q"
              type="search"
              placeholder="Un volcán, un pueblo, un plato…"
              className="h-[52px] min-w-0 flex-[1_1_240px] rounded-pill border border-control-border bg-ground-raised px-[22px] text-base text-ink placeholder:text-ink-muted"
            />
            <button type="submit" className="h-[52px] rounded-pill bg-oro px-[26px] text-base font-bold text-on-oro">
              Explorar el mapa
            </button>
          </form>
        </div>

        <figure className="relative m-0 min-w-0 flex-[1_1_520px]">
          <CurvasDeNivel animate label="Curvas de nivel de los dos volcanes de la isla de Ometepe" className="block h-auto w-full" />
          <figcaption className="absolute bottom-[4%] left-[6%] flex flex-col gap-1.5">
            <span className="font-display text-[26px]">Isla de Ometepe</span>
            <span className="text-sm text-ink-muted">En Rivas. Ficha en verificación.</span>
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="territorios" className="border-t border-line pb-10 pt-7">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="territorios" className="m-0 font-display text-[28px] font-normal">
            Elige un territorio
          </h2>
          <p className="m-0 text-sm text-ink-muted">Cada ficha indica su fuente y la fecha en que se comprobó.</p>
        </div>

        {error && (
          <p role="alert" className="text-status-alert">
            No se pudo cargar el catálogo territorial. Recarga la página para intentarlo de nuevo.
          </p>
        )}
        {!error && territories.length === 0 && (
          <p className="text-ink-muted">
            Los territorios se publican a medida que el equipo editorial verifica sus fuentes. Vuelve pronto.
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
