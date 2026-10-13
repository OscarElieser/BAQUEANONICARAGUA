// Municipios de un territorio, paginados de 6 en 6 (/territorios/<slug>/municipios?pagina=2).
// Solo aparecen los municipios que el equipo ya confirmó con fuente oficial; los borradores no se muestran.
import Link from 'next/link'; // Enlaces internos
import { notFound } from 'next/navigation'; // Página 404
import type { Metadata } from 'next'; // Tipo de los metadatos
import { getTerritory, listMunicipalities } from '@/lib/territories'; // Datos públicos de Supabase
import { pageMetadata } from '@/lib/seo'; // Canónica y versiones por idioma
import { letraMarca } from '@/app/fuentes'; // Letra de la marca
import { t } from '@/i18n/t'; // Textos traducidos

const POR_PAGINA = 6; // Municipios por página

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ pagina?: string }> }; // Parámetros de la ruta

/** Metadatos de la página en su idioma. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params; // Idioma y territorio
  const { territory } = await getTerritory(slug, locale); // Datos publicados
  if (!territory) return {}; // No existe: la página dará 404
  return pageMetadata(locale, `/territorios/${slug}/municipios`, t(locale, 'muni.title', { name: territory.name }), t(locale, 'muni.intro')); // Título y descripción
}

export default async function Municipios({ params, searchParams }: Props) {
  const { locale, slug } = await params; // Idioma y territorio
  const { pagina } = await searchParams; // Página pedida
  const { territory } = await getTerritory(slug, locale); // Territorio publicado
  if (!territory) notFound(); // No existe o no está publicado
  const actual = Math.max(1, Number.parseInt(pagina ?? '1', 10) || 1); // Página válida (1 si viene mal)
  const { data, total, error } = await listMunicipalities(territory.id, actual, POR_PAGINA); // Municipios de esta página
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA)); // Cuántas páginas hay
  const base = `/${locale}/territorios/${slug}/municipios`; // Dirección de esta lista

  return (
    <main className={`${letraMarca.variable} mx-auto max-w-[1100px] px-4 pb-16 sm:px-12`}>
      <nav aria-label={t(locale, 'nav.breadcrumb')} className="pt-6 text-sm">
        <ol className="miga m-0 flex list-none flex-wrap gap-x-2 p-0">
          <li><Link href={`/${locale}`}>{t(locale, 'nav.discover')}</Link></li> {/* Portada */}
          <li><Link href={`/${locale}/territorios`}>{t(locale, 'terr.title')}</Link></li> {/* Catálogo de los 17 */}
          <li><Link href={`/${locale}/territorios/${slug}`}>{territory.name}</Link></li> {/* Ficha del territorio */}
          <li aria-current="page">{t(locale, 'muni.short')}</li> {/* Página actual */}
        </ol>
      </nav>
      <h1 className="terr-grupo m-0 mt-6">{t(locale, 'muni.title', { name: territory.name })}</h1> {/* "Municipios de Granada" */}
      <p className="m-0 mt-2 max-w-[60ch] text-ink-muted">{t(locale, 'muni.intro')}</p> {/* Explica por qué pueden faltar */}

      {error && <p role="alert" className="mt-6 text-status-alert">{t(locale, 'home.error')}</p>} {/* Error de conexión */}
      {!error && total === 0 && <p className="mt-6 rounded-m bg-ground-raised p-5">{t(locale, 'muni.none')}</p>} {/* Aún ninguno confirmado */}

      {data.length > 0 && (
        <>
          <ul className="indice m-0 mt-6 list-none p-0">
            {data.map((m) => (
              <li key={m.slug}>
                <div className="indice-fila">
                  <span className="min-w-0 flex-1">
                    <span className="indice-nombre">{m.name}</span> {/* Nombre del municipio */}
                    <span className="indice-tipo">{t(locale, 'muni.kind')}</span> {/* "Municipio" */}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <nav aria-label={t(locale, 'muni.pages')} className="paginas mt-6">
            {/* Paginación: anterior, números y siguiente */}
            {actual > 1 ? <Link href={`${base}?pagina=${actual - 1}`} aria-label={t(locale, 'gallery.prev')}>‹</Link> : <span aria-hidden="true">‹</span>}
            {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`${base}?pagina=${n}`} aria-current={n === actual ? 'page' : undefined}>{n}</Link> // Número de página
            ))}
            {actual < paginas ? <Link href={`${base}?pagina=${actual + 1}`} aria-label={t(locale, 'gallery.next')}>›</Link> : <span aria-hidden="true">›</span>}
          </nav>
          <p className="mt-2 text-[14px] text-ink-muted">{t(locale, 'muni.showing', { from: String((actual - 1) * POR_PAGINA + 1), to: String(Math.min(actual * POR_PAGINA, total)), total: String(total) })}</p> {/* "Mostrando 1–6 de 12" */}
        </>
      )}
      <p className="mt-8"><Link href={`/${locale}/territorios/${slug}`} className="boton-contorno">{t(locale, 'muni.back', { name: territory.name })}</Link></p> {/* Vuelve a la ficha */}
    </main>
  );
}
