import { publicDb } from '@/lib/territories';

export const revalidate = 3600;

type Event = { id: string; title: string; era: string; start_year: number; end_year: number | null; date_precision: string; summary: string | null; contested: boolean };
type Heritage = { id: string; slug: string; title: string; kind: string; summary: string | null; unesco_recognized: boolean };

const eraLabel: Record<string, string> = {
  prehispanic: 'Prehispánica', colonial: 'Colonial', republican: 'Republicana', contemporary: 'Contemporánea',
};

const year = (y: number) => (y < 0 ? `${-y} a. C.` : String(y));

export default async function Cultura() {
  const db = publicDb();
  const [{ data: events }, { data: heritage }] = await Promise.all([
    db.rpc('history_timeline'),
    db.from('heritage_items').select('id, slug, title, kind, summary, unesco_recognized').order('title'),
  ]);
  const timeline = (events ?? []) as Event[];
  const items = (heritage ?? []) as Heritage[];

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
      <h1 className="mb-3 mt-12 font-display text-[44px] font-normal leading-[0.98] sm:text-[64px]">Historia, arte y cultura</h1>
      <p className="max-w-[56ch] text-[19px] leading-[30px] text-ink-muted">
        Cada contenido cita sus fuentes. Los temas con distintas interpretaciones se presentan con sus perspectivas, y los saberes de las comunidades se publican con su consentimiento.
      </p>

      <div className="mt-10 flex flex-wrap gap-12">
        <section aria-labelledby="linea" className="min-w-0 flex-[2_1_480px]">
          <h2 id="linea" className="font-display text-[28px] font-normal">Línea de tiempo</h2>
          {timeline.length === 0 ? (
            <p className="text-ink-muted">La línea de tiempo se publica a medida que el equipo editorial revisa las fuentes.</p>
          ) : (
            <ol className="m-0 list-none border-l-2 border-line p-0 pl-6">
              {timeline.map((e) => (
                <li key={e.id} className="relative pb-6">
                  <span aria-hidden="true" className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-pill bg-oro" />
                  <p className="m-0 text-sm text-ink-muted">
                    {eraLabel[e.era]}: {e.date_precision === 'approximate' ? 'hacia ' : ''}{year(e.start_year)}{e.end_year ? `–${year(e.end_year)}` : ''}
                  </p>
                  <h3 className="mb-1 mt-1 text-[19px] font-bold">{e.title}</h3>
                  {e.summary && <p className="m-0">{e.summary}</p>}
                  {e.contested && <p className="m-0 mt-1 text-sm text-oro-text">Tiene interpretaciones distintas: la ficha presenta las perspectivas.</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="patrimonio" className="min-w-0 flex-[1_1_300px]">
          <h2 id="patrimonio" className="font-display text-[28px] font-normal">Patrimonio</h2>
          {items.length === 0 ? (
            <p className="text-ink-muted">Aún no hay elementos de patrimonio publicados.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {items.map((h) => (
                <li key={h.id} className="border-b border-line py-3">
                  <p className="m-0 font-bold">{h.title}</p>
                  {h.unesco_recognized && <p className="m-0 text-sm text-status-verified">Reconocido por la UNESCO</p>}
                  {h.summary && <p className="m-0 mt-1 text-ink-muted">{h.summary}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
