import Link from 'next/link';
import { FranjaTejida } from '@/components/FranjaTejida';
import { publicDb } from '@/lib/territories';
import { t } from '@/i18n/t'; // Textos traducidos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { Paginacion } from '@/components/Paginacion'; // Anterior / siguiente
import { pageMetadata } from '@/lib/seo'; // Canónica, idiomas y vista previa

const PER_PAGE = 20; // Relatos por página

/** La primera página se indexa; las anteriores en el tiempo no, pero sus enlaces sí se siguen. */
export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ antes?: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  const { antes } = await searchParams; // Cursor de paginación
  return pageMetadata(locale, '/comunidad', t(locale, 'community.title'), t(locale, 'community.intro'), { noindex: Boolean(antes) }); // Metadatos
}

export const revalidate = 120;

type FeedPost = {
  id: string; title: string | null; body_md: string; created_at: string;
  author_name: string | null; is_promotional: boolean; reactions: number; comments: number;
};

export default async function Comunidad({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ antes?: string }> }) {
  const { locale } = await params; // Idioma
  const { antes } = await searchParams; // Cursor: relatos anteriores a esta fecha
  const before = antes && !Number.isNaN(Date.parse(antes)) ? new Date(antes).toISOString() : null; // Solo fechas válidas
  const { data } = await publicDb().rpc('public_feed', { p_limit: PER_PAGE + 1, p_before: before }); // Uno de más para saber si hay más
  const all = (data ?? []) as FeedPost[]; // Relatos recibidos
  const feed = all.slice(0, PER_PAGE); // Los de esta página
  const nextHref = all.length > PER_PAGE ? `/${locale}/comunidad?antes=${encodeURIComponent(feed[feed.length - 1].created_at)}` : undefined; // Relatos anteriores
  const firstHref = before ? `/${locale}/comunidad` : undefined; // Volver a los más recientes
  return (
    <main>
      <FranjaTejida height={22} />
      <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-12">
        <h1 className="m-0 max-w-[14ch] font-display text-[44px] font-normal leading-[0.98] sm:text-[72px]">
          {t(locale, 'community.title')} {/* Título */}
        </h1>
        <p className="mt-6 max-w-[52ch] text-[19px] leading-[30px] text-ink-muted">
          {t(locale, 'community.intro')} {/* Qué es la Vitrina */}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${locale}/mapa`} className="flex h-[52px] items-center rounded-pill bg-oro px-7 font-bold text-on-oro no-underline">
            {t(locale, 'community.meet')} {/* Botón */}
          </Link>
          <Link href={`/${locale}/comunidad/registrar`} className="flex h-[52px] items-center rounded-pill border-[1.5px] border-control-border px-7 font-bold text-ink no-underline">
            {t(locale, 'community.publish')} {/* Botón */}
          </Link>
        </div>
        <section aria-labelledby="relatos" className="mt-14 max-w-[var(--measure)]">
          <h2 id="relatos" className="font-display text-[28px] font-normal">{t(locale, 'community.stories')}</h2>
          <p className="text-sm text-ink-muted">{t(locale, 'community.order_note')}</p>
          {feed.length === 0 ? (
            <p className="text-ink-muted">{t(locale, 'community.empty')}</p>
          ) : (
            <ol className="m-0 list-none p-0">
              {feed.map((p) => (
                <li key={p.id} className="border-b border-line py-5">
                  <p className="m-0 text-sm text-ink-muted">
                    {p.author_name ?? t(locale, 'community.traveler')} — {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(p.created_at))}
                    {p.is_promotional && <span className="ml-2 font-bold text-oro-text">{t(locale, 'community.promotional')}</span>}
                  </p>
                  {p.title && <h3 className="mb-1 mt-2 text-[20px] font-bold">{p.title}</h3>}
                  <p className="m-0 mt-1 line-clamp-4 whitespace-pre-line">{p.body_md}</p>
                  <p className="m-0 mt-2 text-sm text-ink-muted">{t(locale, 'community.interactions', { reactions: p.reactions, comments: p.comments })}</p>
                </li>
              ))}
            </ol>
          )}
          <Paginacion locale={locale} prevHref={firstHref} nextHref={nextHref} /> {/* Volver a lo reciente / relatos anteriores */}
        </section>
      </div>
    </main>
  );
}
