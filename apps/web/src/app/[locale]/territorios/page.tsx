// Catálogo de los 17 territorios: 15 departamentos y 2 regiones autónomas, con foto real, silueta y estado de su ficha.
// No muestra cifras que aún no están comprobadas (destinos, municipios publicados, población): solo lo que es cierto hoy.
import Link from 'next/link'; // Enlaces internos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { CreditoFoto } from '@/components/CreditoFoto'; // Crédito de la foto del encabezado
import { BuscadorTerritorios } from '@/components/BuscadorTerritorios'; // Filtro por nombre
import { SpriteMapa } from '@/components/SpriteMapa'; // Formas de los territorios (para las siluetas)
import { letraMarca } from '@/app/fuentes'; // Letra de la marca
import { listTerritories } from '@/lib/territories'; // Territorios publicados desde Supabase
import { cajaDe, territorios, ZONA_TEXTO } from '@/lib/portadas'; // Los 17, su zona y el encuadre de su forma
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { pageMetadata } from '@/lib/seo'; // Canónica y versiones por idioma
import { t } from '@/i18n/t'; // Textos traducidos

export const revalidate = 3600; // Se vuelve a generar cada hora

/** Metadatos de la página en su idioma. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return pageMetadata(locale, '/territorios', t(locale, 'terr.title'), t(locale, 'terr.intro')); // Título y descripción
}

const esRegion = (slug: string) => slug.startsWith('costa-caribe'); // Las dos regiones autónomas del Caribe

export default async function Territorios({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma
  const { data } = await listTerritories(); // Publicados (si falla, todos aparecen en verificación)
  const publicados = new Set((data ?? []).map((ter) => ter.slug)); // Slugs con ficha
  const portada = fotoDe('portada-pacifico'); // Foto del encabezado (Concepción, Ometepe)
  const grupos = [
    { clave: 'terr.departments' as const, items: territorios.filter((ter) => !esRegion(ter.slug)) }, // Los 15 departamentos
    { clave: 'terr.regions' as const, items: territorios.filter((ter) => esRegion(ter.slug)) }, // Las 2 regiones autónomas
  ];

  return (
    <main className={`${letraMarca.variable} mx-auto max-w-[1280px] px-4 pb-16 sm:px-12`}>
      <SpriteMapa /> {/* Biblioteca de formas para las siluetas */}
      <nav aria-label={t(locale, 'nav.breadcrumb')} className="pt-6 text-sm">
        <ol className="miga m-0 flex list-none flex-wrap gap-x-2 p-0">
          <li><Link href={`/${locale}`}>{t(locale, 'nav.discover')}</Link></li> {/* Portada */}
          <li aria-current="page">{t(locale, 'terr.title')}</li> {/* Página actual */}
        </ol>
      </nav>
      <header className="terr-portada tema-noche">
        {portada && <img src={portada.imagen_movil} srcSet={srcsetDe(portada)} sizes="100vw" alt={portada.lugar} decoding="async" className="terr-portada-foto" />} {/* Foto real de fondo */}
        <div className="terr-portada-texto">
          <h1 className="terr-titulo m-0">{t(locale, 'terr.title')}</h1> {/* "Departamentos y regiones" */}
          <p className="m-0 mt-2 text-[20px] font-bold">{t(locale, 'index.count_detail')}</p> {/* "15 departamentos y 2 regiones autónomas" */}
          <p className="m-0 mt-2 max-w-[56ch] text-[16px] leading-6">{t(locale, 'terr.intro')}</p> {/* Qué hay aquí y cómo se publica */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/${locale}/mapa`} className="boton-marca">{t(locale, 'terr.see_map')}</Link> {/* Al mapa */}
            <a href="#regiones" className="boton-contorno">{t(locale, 'terr.regions')}</a> {/* Salta a las regiones autónomas */}
          </div>
          {portada && <CreditoFoto locale={locale} foto={portada} className="mt-4 block" />} {/* Crédito de la foto */}
        </div>
      </header>

      <BuscadorTerritorios etiqueta={t(locale, 'terr.search')} vacio={t(locale, 'terr.search_empty')} /> {/* Filtra las tarjetas por nombre */}

      {grupos.map((g) => (
        <section key={g.clave} id={g.clave === 'terr.regions' ? 'regiones' : 'departamentos'} aria-labelledby={`${g.clave}-t`} className="pt-6" data-grupo="">
          <h2 id={`${g.clave}-t`} className="terr-grupo m-0 mb-5">
            {t(locale, g.clave)} <span className="text-ink-muted">({g.items.length})</span> {/* Nombre del grupo y cuántos son */}
          </h2>
          <ul className="terr-rejilla m-0 list-none p-0">
            {g.items.map((ter) => {
              const f = fotoDe(ter.slug); // Foto real (puede faltar)
              const pub = publicados.has(ter.slug); // Si tiene ficha
              const c = cajaDe(ter.d); // Encuadre de la silueta
              const lado = Math.max(c.w, c.h) * 1.1; // Cuadro con margen
              return (
                <li key={ter.slug} className={`terr-tarjeta zt-${ter.zone}`} data-nombre={ter.name}>
                  {f ? <img src={f.imagen_movil} alt={f.lugar} width={800} height={500} loading="lazy" decoding="async" className="terr-foto" /> : <span aria-hidden="true" className="terr-foto" />}
                  {/* Foto real; el texto alternativo dice qué lugar es */}
                  <div className="terr-cuerpo" data-sola={pub ? undefined : ''}>
                    <div className="min-w-0">
                      <h3 className="terr-nombre m-0">
                        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" className="terr-pin"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.6" fill="var(--ground-raised)" /></svg> {/* Marcador en el color de la zona */}
                        {ter.name}
                      </h3> {/* Nombre del territorio */}
                      <p className="m-0 text-[14px] text-ink-muted">{t(locale, ZONA_TEXTO[ter.zone])}</p> {/* Zona de paisaje */}
                      <p className={`m-0 mt-1 text-[14px] font-bold ${pub ? 'text-status-verified' : 'text-oro-text'}`}>{t(locale, pub ? 'tmap.status_published' : 'tmap.status_pending')}</p> {/* Estado real */}
                    </div>
                    <svg aria-hidden="true" focusable="false" viewBox={`${c.x + c.w / 2 - lado / 2} ${c.y + c.h / 2 - lado / 2} ${lado} ${lado}`} className="terr-silueta">
                      <use href={`#ter-${ter.slug}`} /> {/* Forma real del territorio, en el color de su zona */}
                    </svg>
                  </div>
                  {pub && <Link href={`/${locale}/territorios/${ter.slug}`} className="terr-accion" aria-label={t(locale, 'explorer.open', { name: ter.name })}>{t(locale, 'terr.open')}</Link>} {/* Abre la ficha (sin ficha, el estado de arriba ya lo dice) */}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="mt-8 text-[14px]"><Link href={`/${locale}/creditos`} className="credito-foto">{t(locale, 'credits.link')}</Link></p> {/* Autores y licencias de las fotos */}
    </main>
  );
}
