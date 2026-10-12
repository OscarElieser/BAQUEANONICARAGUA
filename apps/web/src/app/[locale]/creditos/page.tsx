// Créditos de todas las fotos reales del sitio: lugar, autor, licencia y origen. Cumple la atribución que piden las licencias.
import type { Metadata } from 'next'; // Tipo de los metadatos
import { todasLasFotos } from '@/lib/fotos'; // Catálogo de fotos
import { t } from '@/i18n/t'; // Textos traducidos
import { pageMetadata } from '@/lib/seo'; // Canónica y versiones por idioma

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return pageMetadata(locale, '/creditos', t(locale, 'credits.title'), t(locale, 'credits.intro')); // Título y descripción
}

export default async function Creditos({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-12 sm:px-12">
      <h1 className="m-0 font-display text-[40px] font-normal">{t(locale, 'credits.title')}</h1> {/* Título */}
      <p className="mb-8 mt-3 max-w-[60ch] text-ink-muted">{t(locale, 'credits.intro')}</p> {/* Agradecimiento */}
      <ul className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {todasLasFotos().map(([clave, f]) => (
          <li key={clave} className="overflow-hidden rounded-m bg-ground-raised">
            <img src={f.imagen_movil} alt={f.lugar} width={800} height={Math.round((800 * f.alto) / f.ancho)} loading="lazy" decoding="async" className="block aspect-[16/10] h-auto w-full object-cover" /> {/* Vista de la foto */}
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 p-4 text-[14px]">
              <dt className="text-ink-muted">{t(locale, 'credits.place')}</dt><dd className="m-0 font-bold">{f.lugar}</dd> {/* Lugar */}
              <dt className="text-ink-muted">{t(locale, 'credits.author')}</dt><dd className="m-0">{f.autor}</dd> {/* Autor */}
              <dt className="text-ink-muted">{t(locale, 'credits.license')}</dt><dd className="m-0">{f.licencia_url ? <a href={f.licencia_url} rel="license noopener noreferrer" target="_blank">{f.licencia}</a> : f.licencia}</dd> {/* Licencia */}
              <dt className="text-ink-muted">{t(locale, 'credits.source')}</dt><dd className="m-0"><a href={f.pagina} target="_blank" rel="noopener noreferrer">{t(locale, 'credits.see_original')}</a></dd> {/* Página en Commons */}
            </dl>
          </li>
        ))}
      </ul>
    </main>
  );
}
