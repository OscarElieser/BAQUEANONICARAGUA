// Crónicas: relatos reales publicados por la comunidad (viajeros, gente local y emprendedores), filtrables por territorio.
// Los datos salen de public_feed en Supabase (solo lo público y visible). No hay crónicas de ejemplo ni cifras inventadas.
import Link from 'next/link'; // Enlaces internos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { CreditoFoto } from '@/components/CreditoFoto'; // Crédito de la foto del encabezado
import { Paginacion } from '@/components/Paginacion'; // Anterior / siguiente
import { SpriteMapa } from '@/components/SpriteMapa'; // Formas de los territorios (siluetas)
import { letraFirma, letraMarca } from '@/app/fuentes'; // Letras de la marca y de la firma
import { publicDb } from '@/lib/territories'; // Lectura pública de Supabase
import { territorios, cajaDe } from '@/lib/portadas'; // Los 17 y el encuadre de su forma
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { pageMetadata } from '@/lib/seo'; // Canónica y versiones por idioma
import { t } from '@/i18n/t'; // Textos traducidos
import { ID_TERRITORIO, SLUG_DE_ID } from '@/lib/idsTerritorio'; // Número de cada territorio en la base de datos

export const revalidate = 120; // Se renueva cada dos minutos

const POR_PAGINA = 12; // Crónicas por página


type Cronica = { id: string; title: string | null; body_md: string; created_at: string; author_name: string | null; department_id: number | null; is_promotional: boolean; reactions: number; comments: number }; // Lo que devuelve public_feed
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ territorio?: string; antes?: string }> }; // Parámetros de la ruta

/** Metadatos: la primera página se indexa; las filtradas o anteriores no. */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params; // Idioma
  const { territorio, antes } = await searchParams; // Filtros
  return pageMetadata(locale, '/cronicas', t(locale, 'chron.title'), t(locale, 'chron.intro'), { noindex: Boolean(territorio || antes) }); // Metadatos
}

export default async function Cronicas({ params, searchParams }: Props) {
  const { locale } = await params; // Idioma
  const { territorio, antes } = await searchParams; // Territorio elegido y cursor
  const elegido = territorio && ID_TERRITORIO[territorio] ? territorio : null; // Solo slugs conocidos
  const before = antes && !Number.isNaN(Date.parse(antes)) ? new Date(antes).toISOString() : null; // Solo fechas válidas
  const { data, error } = await publicDb().rpc('public_feed', { p_limit: POR_PAGINA + 1, p_before: before, p_department: elegido ? ID_TERRITORIO[elegido] : null }); // Uno de más para saber si hay más
  const todas = (data ?? []) as Cronica[]; // Crónicas recibidas
  const lista = todas.slice(0, POR_PAGINA); // Las de esta página
  const filtro = elegido ? `territorio=${elegido}&` : ''; // Conserva el filtro al paginar
  const siguiente = todas.length > POR_PAGINA ? `/${locale}/cronicas?${filtro}antes=${encodeURIComponent(lista[lista.length - 1].created_at)}` : undefined; // Crónicas anteriores
  const primera = before ? `/${locale}/cronicas${elegido ? `?territorio=${elegido}` : ''}` : undefined; // Volver a las más recientes
  const portada = fotoDe('portada-norte'); // Foto del encabezado (montañas de Matagalpa)
  const fecha = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }); // Fechas en el idioma de la página
  const nombreDe = (slug: string) => territorios.find((x) => x.slug === slug)?.name ?? slug; // Nombre del territorio

  return (
    <main className={`${letraMarca.variable} ${letraFirma.variable} mx-auto max-w-[1280px] px-4 pb-16 sm:px-12`}>
      <SpriteMapa /> {/* Formas para las siluetas de las tarjetas */}
      <header className="terr-portada cron-portada tema-noche">
        {portada && <img src={portada.imagen_movil} srcSet={srcsetDe(portada)} sizes="100vw" alt={portada.lugar} decoding="async" className="terr-portada-foto" />} {/* Foto real de fondo */}
        <div className="terr-portada-texto">
          <h1 className="terr-titulo m-0">{t(locale, 'chron.title')}</h1> {/* "Crónicas" */}
          <p className="m-0 mt-2 text-[22px] font-bold">{t(locale, 'chron.subtitle')}</p> {/* "Historias reales que inspiran a viajar" */}
          <p className="m-0 mt-2 max-w-[56ch] text-[16px] leading-6">{t(locale, 'chron.intro')}</p> {/* Quién escribe y cómo se publica */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" disabled className="boton-marca cursor-not-allowed opacity-100" aria-describedby="cron-pronto">{t(locale, 'chron.publish')}</button> {/* Publicar: aún sin formulario en la web */}
            <span id="cron-pronto" className="text-[14px]">{t(locale, 'plans.unavailable')}</span> {/* Lo dice claramente */}
          </div>
          {portada && <CreditoFoto locale={locale} foto={portada} className="mt-4 block" />} {/* Crédito de la foto */}
        </div>
        <p aria-hidden="true" className="cron-sello">{t(locale, 'chron.stamp')}</p> {/* Sello pintado a mano (decoración) */}
      </header>

      <nav aria-label={t(locale, 'chron.filter')} className="mt-6">
        <ul className="cron-filtro m-0 list-none p-0">
          {/* Filtro por territorio: cada foto es un enlace real que recarga la lista */}
          <li>
            <Link href={`/${locale}/cronicas`} aria-current={!elegido ? 'page' : undefined} className="cron-chip">
              <span aria-hidden="true" className="cron-chip-todos">17</span> {/* Todos los territorios */}
              <span>{t(locale, 'chron.all')}</span>
            </Link>
          </li>
          {territorios.map((ter) => (
            <li key={ter.slug}>
              <Link href={`/${locale}/cronicas?territorio=${ter.slug}`} aria-current={elegido === ter.slug ? 'page' : undefined} className="cron-chip">
                {fotoDe(ter.slug) ? <img src={fotoDe(ter.slug)!.imagen_movil} alt="" width={48} height={48} loading="lazy" decoding="async" /> : <span aria-hidden="true" className="cron-chip-todos" />}
                {/* Foto decorativa: el nombre ya dice cuál es */}
                <span>{ter.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="cron-lista" className="pt-8">
        <h2 id="cron-lista" className="terr-grupo m-0 mb-5">{elegido ? t(locale, 'chron.from', { name: nombreDe(elegido) }) : t(locale, 'chron.latest')}</h2> {/* Título de la lista */}
        {error && <p role="alert" className="text-status-alert">{t(locale, 'home.error')}</p>} {/* Error de conexión */}
        {!error && lista.length === 0 && (
          <div className="cron-vacio">
            <p className="m-0 text-[18px] font-bold">{t(locale, 'chron.empty_title')}</p> {/* Aún no hay crónicas */}
            <p className="m-0 mt-1 text-ink-muted">{t(locale, 'chron.empty')}</p> {/* Cómo llegarán */}
          </div>
        )}
        {lista.length > 0 && (
          <ol className="cron-rejilla m-0 list-none p-0">
            {lista.map((c) => {
              const slug = c.department_id ? SLUG_DE_ID[c.department_id] : undefined; // Territorio de la crónica (si lo tiene)
              const ter = slug ? territorios.find((x) => x.slug === slug) : undefined; // Su forma
              const caja = ter ? cajaDe(ter.d) : undefined; // Encuadre de la silueta
              const lado = caja ? Math.max(caja.w, caja.h) * 1.1 : 0; // Cuadro con margen
              return (
                <li key={c.id} className={`cron-tarjeta ${ter ? `zt-${ter.zone}` : ''}`}>
                  <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                    {ter && caja && (
                      <svg aria-hidden="true" focusable="false" viewBox={`${caja.x + caja.w / 2 - lado / 2} ${caja.y + caja.h / 2 - lado / 2} ${lado} ${lado}`} className="cron-silueta"><use href={`#ter-${ter.slug}`} /></svg>
                    )}
                    {/* Silueta del territorio de la crónica, en el color de su zona */}
                    <span>{ter ? ter.name : t(locale, 'chron.no_territory')}</span> {/* Territorio */}
                    {c.is_promotional && <span className="font-bold text-oro-text">{t(locale, 'community.promotional')}</span>} {/* Publicidad identificada */}
                  </div>
                  {c.title && <h3 className="cron-titulo m-0 mt-3">{c.title}</h3>} {/* Título */}
                  <p className="m-0 mt-2 line-clamp-4 whitespace-pre-line text-[15px] leading-6">{c.body_md}</p> {/* Inicio del relato */}
                  <p className="m-0 mt-4 text-[14px] text-ink-muted">
                    {c.author_name ?? t(locale, 'community.traveler')} — <time dateTime={c.created_at}>{fecha.format(new Date(c.created_at))}</time> {/* Autor y fecha */}
                  </p>
                  <p className="m-0 mt-1 text-[13px] text-ink-muted">{t(locale, 'community.interactions', { reactions: c.reactions, comments: c.comments })}</p> {/* Reacciones y comentarios reales */}
                </li>
              );
            })}
          </ol>
        )}
        <Paginacion locale={locale} prevHref={primera} nextHref={siguiente} /> {/* Más recientes / anteriores */}
      </section>
    </main>
  );
}
