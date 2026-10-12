import { publicDb } from '@/lib/territories'; // Acceso público a la base de datos
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { pageMetadata } from '@/lib/seo'; // Canónica, idiomas y vista previa
import { letraCultura } from '@/app/fuentes'; // Letra propia de Cultura (Caprasimo)
import { Greca } from '@/components/Greca'; // Friso de greca que se traza al llegar

export const revalidate = 3600;

type Event = { id: string; title: string; era: string; start_year: number; end_year: number | null; date_precision: string; summary: string | null; contested: boolean };
type Heritage = { id: string; slug: string; title: string; kind: string; summary: string | null; unesco_recognized: boolean };

const eraKey: Record<string, MessageKey> = {
  prehispanic: 'era.prehispanic', colonial: 'era.colonial', republican: 'era.republican', contemporary: 'era.contemporary', // Épocas
}; // Clave del nombre de cada época

const year = (locale: string, y: number) => (y < 0 ? t(locale, 'culture.bce', { year: -y }) : String(y)); // Año, con "a. C." si es antes de Cristo

/** Metadatos para buscadores en el idioma de la página. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return pageMetadata(locale, '/cultura', t(locale, 'culture.title'), t(locale, 'culture.intro')); // Canónica y versiones por idioma
}

export default async function Cultura({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma de la página
  const db = publicDb();
  const [{ data: events }, { data: heritage }] = await Promise.all([
    db.rpc('history_timeline'),
    db.from('heritage_items').select('id, slug, title, kind, summary, unesco_recognized').order('title'),
  ]);
  const timeline = (events ?? []) as Event[];
  const items = (heritage ?? []) as Heritage[];

  return (
    <main className={`${letraCultura.variable} mundo-cultura pb-16`}>
      {/* Mundo de Cultura: barro de San Juan de Oriente, greca y letra rotunda */}
      <header className="cultura-heroe">
        <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-14 sm:px-12">
          <h1 className="m-0 max-w-[16ch] font-mundo text-[44px] font-normal leading-[1] sm:text-[80px]">{t(locale, 'culture.title')}</h1> {/* Titular del mundo */}
          <p className="mb-0 mt-6 max-w-[56ch] text-[19px] leading-[30px]">
            {t(locale, 'culture.intro')} {/* Cómo se trata el contenido */}
          </p>
        </div>
        <Greca className="block h-[40px] w-full text-[var(--band-marfil)]" /> {/* Friso de greca */}
        <div className="h-3" /> {/* Respiro bajo el friso */}
      </header>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-12">
      <div className="mt-10 flex flex-wrap gap-12">
        <section aria-labelledby="linea" className="min-w-0 flex-[2_1_480px]">
          <h2 id="linea" className="mb-6 mt-0 font-mundo text-[34px] font-normal">{t(locale, 'culture.timeline')}</h2>
          {timeline.length === 0 ? (
            <p className="text-ink-muted">{t(locale, 'culture.timeline_empty')}</p>
          ) : (
            <ol className="m-0 list-none border-l-2 border-line p-0 pl-6">
              {timeline.map((e) => (
                <li key={e.id} className="relative pb-6">
                  <span aria-hidden="true" className="sello absolute -left-[33px] top-1" /> {/* Sello de barro */}
                  <p className="m-0 text-sm text-ink-muted">
                    {eraKey[e.era] ? t(locale, eraKey[e.era]) : e.era}: {e.date_precision === 'approximate' ? t(locale, 'culture.around', { year: year(locale, e.start_year) }) : year(locale, e.start_year)}{e.end_year ? `–${year(locale, e.end_year)}` : ''}
                  </p>
                  <h3 className="mb-1 mt-1 font-mundo text-[22px] font-normal">{e.title}</h3> {/* Hecho histórico */}
                  {e.summary && <p className="m-0">{e.summary}</p>}
                  {e.contested && <p className="m-0 mt-1 text-sm text-oro-text">{t(locale, 'culture.contested')}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="patrimonio" className="min-w-0 flex-[1_1_300px]">
          <h2 id="patrimonio" className="mb-6 mt-0 font-mundo text-[34px] font-normal">{t(locale, 'culture.heritage')}</h2>
          {items.length === 0 ? (
            <p className="text-ink-muted">{t(locale, 'culture.heritage_empty')}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {items.map((h) => (
                <li key={h.id} className="tarjeta-barro mb-4">
                  <Greca unidades={8} alto={22} className="block h-[22px] w-full opacity-60" /> {/* Borde de greca */}
                  <div className="px-5 pb-5 pt-3">
                  <p className="m-0 font-mundo text-[22px]">{h.title}</p> {/* Nombre de la pieza */}
                  {h.unesco_recognized && <p className="m-0 text-sm text-status-verified">{t(locale, 'culture.unesco')}</p>}
                  {h.summary && <p className="m-0 mt-1 text-ink-muted">{h.summary}</p>} {/* Resumen */}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      </div>
    </main>
  );
}
