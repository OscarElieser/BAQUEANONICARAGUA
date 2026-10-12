import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CurvasDeNivel } from '@/components/CurvasDeNivel';
import { EstadoVerificacion } from '@/components/EstadoVerificacion';
import { getDestination, reportedByLabel } from '@/lib/catalog';

export const revalidate = 1800;

export default async function DestinoPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const data = await getDestination(slug);
  if (!data) notFound();
  const { destination: d, prices, rows, sourceHref } = data;
  const money = (n: number, c: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: c }).format(n);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
      <nav aria-label="Ruta" className="pt-6 text-sm">
        <Link href={`/${locale}`}>Descubrir</Link>
      </nav>
      <header className="flex flex-wrap items-end gap-6 pt-4">
        <div className="min-w-0 flex-[1_1_420px]">
          <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02] sm:text-[48px]">{d.name}</h1>
          {d.summary && <p className="mt-3 max-w-[var(--measure)] text-[19px] leading-[30px] text-ink-muted">{d.summary}</p>}
        </div>
        <CurvasDeNivel className="h-auto w-full max-w-[320px] flex-[0_1_320px]" />
      </header>

      <div className="mt-8 flex flex-wrap gap-10">
        <div className="min-w-0 max-w-[var(--measure)] flex-[999_1_560px]">
          {d.description_md && <div className="whitespace-pre-line text-[17px] leading-[28px]">{d.description_md}</div>}

          {d.access_notes && (
            <section className="mt-8">
              <h2 className="font-display text-[26px] font-normal">Cómo llegar</h2>
              <p className="whitespace-pre-line">{d.access_notes}</p>
            </section>
          )}
          {d.environmental_notes && (
            <section className="mt-8">
              <h2 className="font-display text-[26px] font-normal">Cuida este lugar</h2>
              <p className="whitespace-pre-line">{d.environmental_notes}</p>
            </section>
          )}
          <section className="mt-8">
            <h2 className="font-display text-[26px] font-normal">Tarifas</h2>
            {prices.length === 0 ? (
              <p className="text-ink-muted">No hay tarifas verificadas. Consulta directamente antes de ir.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {prices.map((p) => (
                  <li key={p.label} className="border-b border-line py-3">
                    <div className="flex justify-between gap-4 font-bold">
                      <span>{p.label}</span>
                      <span>{money(p.amount, p.currency)}{p.unit ? ` ${p.unit}` : ''}</span>
                    </div>
                    <p className="m-0 text-sm text-ink-muted">Tarifa {reportedByLabel[p.reported_by]} el {date(p.observed_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="min-w-0 flex-[1_1_300px]">
          <EstadoVerificacion rows={rows} sourceHref={sourceHref} locale={locale} />
        </aside>
      </div>
    </main>
  );
}
