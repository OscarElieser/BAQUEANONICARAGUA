import type { Metadata } from 'next'; // Tipo de los metadatos de la página
import Link from 'next/link'; // Enlaces internos
import { notFound } from 'next/navigation'; // Respuesta 404
import { locales } from '@/i18n/config'; // Idiomas disponibles
import { TextoLegal } from '@/components/TextoLegal'; // Texto con marcadores resaltados
import { legalFor, legalSlugs } from '@/lib/legal'; // Textos legales
import { t } from '@/i18n/t'; // Textos de la interfaz
import { pageMetadata } from '@/lib/seo'; // Canónica, idiomas y vista previa
import { BotonImprimir } from '@/components/BotonImprimir'; // Imprimir o guardar como PDF
import { CreditoFoto } from '@/components/CreditoFoto'; // Crédito de la foto del encabezado
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { letraFirma, letraMarca } from '@/app/fuentes'; // Letras de la marca y de la firma

// Foto real del encabezado de cada página (todas de Wikimedia Commons, con crédito visible)
const FOTO_DE: Record<string, string> = { 'sobre-nosotros': 'rio-san-juan', privacidad: 'jinotega', cookies: 'carazo', terminos: 'esteli', accesibilidad: 'leon', contacto: 'rivas' };

export const dynamicParams = false; // Solo existen las páginas declaradas: cualquier otra dirección da 404

/** Genera una página por idioma y por texto legal (se construyen de antemano). */
export function generateStaticParams() {
  return locales.flatMap((locale) => legalSlugs.map((pagina) => ({ locale, pagina }))); // Todas las combinaciones
}

/** Título y descripción para buscadores y pestañas del navegador. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string; pagina: string }> }): Promise<Metadata> {
  const { locale, pagina } = await params; // Idioma y página pedidos
  const page = legalFor(locale).file.pages.find((p) => p.slug === pagina); // Busca la página
  return page ? pageMetadata(locale, `/${pagina}`, page.title, page.summary) : {}; // Metadatos con canónica y versiones por idioma
}

/** Convierte "2026-10-12" en "12 de octubre de 2026". */
function fechaLarga(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-NI' : locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`)); // Fecha en español de Nicaragua
}

/** Página legal o institucional: Sobre nosotros, Privacidad, Cookies, Términos, Accesibilidad, Contacto. */
export default async function PaginaLegal({ params }: { params: Promise<{ locale: string; pagina: string }> }) {
  const { locale, pagina } = await params; // Idioma y página pedidos
  const { file, translated } = legalFor(locale); // Textos del idioma (o español si falta la traducción)
  const page = file.pages.find((p) => p.slug === pagina); // Página pedida
  if (!page) notFound(); // No existe: 404
  const anchor = (i: number) => `seccion-${i + 1}`; // Identificador de cada sección para enlazarla
  const foto = fotoDe(FOTO_DE[pagina] ?? 'portada-pacifico'); // Foto del encabezado

  return (
    <main className={`${letraMarca.variable} ${letraFirma.variable} mx-auto max-w-[1280px] px-4 pb-20 pt-4 sm:px-12`}>
      <header className="terr-portada legal-portada tema-noche">
        {foto && <img src={foto.imagen_movil} srcSet={srcsetDe(foto)} sizes="100vw" alt={foto.lugar} decoding="async" className="terr-portada-foto" />} {/* Foto real de fondo */}
        <div className="terr-portada-texto max-w-[68ch]">
          <h1 className="terr-titulo m-0">{page.title}</h1> {/* Título */}
          <p className="mt-3 text-[18px] leading-[28px]">{page.summary}</p> {/* Resumen */}
          <div className="mt-4 flex flex-wrap gap-2 text-[14px]">
            <span className="rounded-pill bg-[color-mix(in_oklab,var(--band-marfil)_14%,transparent)] px-3 py-1">{t(locale, 'legal.version', { date: fechaLarga(file.version, locale) })}</span> {/* Fecha de la versión vigente */}
            <span className="rounded-pill border border-dashed border-oro-text px-3 py-1 text-oro-text">{file.status_note}</span> {/* Aviso de borrador */}
          </div>
          {!translated && <p className="mt-3 text-[15px]">{t(locale, 'legal.spanish_only')}</p>} {/* Aviso honesto cuando falta la traducción */}
          {foto && <CreditoFoto locale={locale} foto={foto} className="mt-4 block" />} {/* Crédito de la foto */}
        </div>
        <p aria-hidden="true" className="cron-sello">{t(locale, 'brand.slogan_1')} {t(locale, 'brand.slogan_2')}</p> {/* Lema escrito a mano (decoración) */}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,64ch)] xl:grid-cols-[240px_minmax(0,64ch)_260px]">
        <nav aria-label={t(locale, 'legal.on_this_page')} className="lg:sticky lg:top-6 lg:self-start">
          <details open className="group">
            <summary className="cursor-pointer list-none font-bold">{t(locale, 'legal.on_this_page')}</summary> {/* Índice plegable en el teléfono */}
            <ol className="indice-legal m-0 mt-3 list-none space-y-1 p-0 text-[15px]">
              {page.sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#${anchor(i)}`}>
                    {s.heading} {/* Enlace a la sección */}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </nav>

        <ol lang="es" className="m-0 list-none border-l border-line p-0">
          {page.sections.map((s, i) => (
            <li key={s.heading} id={anchor(i)} className="relative scroll-mt-6 pb-8 pl-7">
              <span aria-hidden className="absolute -left-[6px] top-[10px] h-[11px] w-[11px] rounded-full border-2 border-oro bg-ground" /> {/* Punto del sendero de lectura */}
              <h2 className="m-0 font-display text-[26px] font-normal leading-[1.2]">{s.heading}</h2> {/* Título de la sección */}
              {s.body?.map((p) => (
                <p key={p} className="mt-3 text-[17px] leading-[28px]">
                  <TextoLegal text={p} /> {/* Párrafo */}
                </p>
              ))}
              {s.items && (
                <ul className="mt-3 space-y-2 pl-5 text-[17px] leading-[28px]">
                  {s.items.map((it) => (
                    <li key={it}>
                      <TextoLegal text={it} /> {/* Punto de la lista */}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <aside className="legal-tarjeta self-start xl:sticky xl:top-6">
          <p className="m-0 font-bold">{t(locale, 'legal.print_title')}</p> {/* "Guárdalo o imprímelo" */}
          <p className="m-0 mt-1 mb-4 text-[14px] text-ink-muted">{t(locale, 'legal.print_text')}</p> {/* Cómo guardarlo como PDF */}
          <BotonImprimir texto={t(locale, 'legal.print')} /> {/* Abre el diálogo de impresión */}
        </aside>
      </div>

      <nav aria-label={t(locale, 'legal.other_pages')} className="mt-6 max-w-[64ch] border-t border-line pt-6">
        <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
          {file.pages
            .filter((p) => p.slug !== page.slug) // Todas menos la actual
            .map((p) => (
              <li key={p.slug}>
                <Link href={`/${locale}/${p.slug}`}>{p.title}</Link> {/* Enlace a otra página legal */}
              </li>
            ))}
        </ul>
      </nav>
    </main>
  );
}
