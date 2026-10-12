// "Explora a tu manera": seis caminos de entrada con fotos reales (Wikimedia Commons) y su crédito.
// Cada mosaico lleva a una página que ya existe; no muestra datos inventados (ni precios ni valoraciones).
import Link from 'next/link'; // Enlaces internos
import { CreditoFoto } from './CreditoFoto'; // Autor y licencia de cada foto
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Catálogo de fotos reales
import { t } from '@/i18n/t'; // Textos traducidos

// Caminos: clave del texto, ruta real y foto que lo acompaña (el lugar de la foto se lee en su texto alternativo)
const caminos = [
  { clave: 'map', ruta: 'mapa', foto: 'masaya' }, // Mapa vivo, con el cráter del Masaya
  { clave: 'territories', ruta: '#territorios', foto: 'esteli' }, // Lista de los 17, con Estelí desde Tisey
  { clave: 'culture', ruta: 'cultura', foto: 'granada' }, // Cultura, con la catedral de Granada
  { clave: 'community', ruta: 'comunidad', foto: 'rio-san-juan' }, // Comunidad, con el río desde El Castillo
  { clave: 'adventure', ruta: 'mi-aventura', foto: 'madriz' }, // Mi aventura, con el cañón de Somoto
  { clave: 'business', ruta: 'planes', foto: 'rivas' }, // Planes para negocios, con la bahía de San Juan del Sur
] as const;

export function ModosExplorar({ locale }: { locale: string }) {
  return (
    <section aria-labelledby="modos-titulo" className="modos border-t border-line pb-12 pt-8">
      <div className="mb-6 max-w-[62ch]">
        <h2 id="modos-titulo" className="modos-titulo m-0">{t(locale, 'home.ways_title')}</h2> {/* "Explora a tu manera" */}
        <p className="mb-0 mt-2 text-[15px] leading-6 text-ink-muted">{t(locale, 'home.ways_intro')}</p> {/* Aclara que las fotos son reales */}
      </div>
      <ul className="modos-rejilla m-0 list-none p-0">
        {caminos.map((c, i) => {
          const f = fotoDe(c.foto); // Foto real del camino (puede faltar)
          const href = c.ruta.startsWith('#') ? c.ruta : `/${locale}/${c.ruta}`; // Ancla en esta página o ruta del idioma
          return (
            <li key={c.clave} className="modos-celda" data-grande={i === 0 ? '' : undefined} data-ancho={i === caminos.length - 1 ? '' : undefined}>
              {/* El primero ocupa dos filas y el último toda la fila, como franja de cierre */}
              <Link href={href} className="modos-mosaico">
                {f && (
                  <img src={f.imagen_movil} srcSet={srcsetDe(f)} sizes="(min-width: 900px) 40vw, 100vw" alt={f.lugar} loading="lazy" decoding="async" className="modos-foto" />
                )}
                {/* Foto real; el texto alternativo dice qué lugar es */}
                <span className="modos-texto">
                  <span className="modos-nombre">{t(locale, `ways.${c.clave}`)}</span> {/* Nombre del camino */}
                  <span className="modos-desc">{t(locale, `ways.${c.clave}_desc`)}</span> {/* Qué hay ahí */}
                </span>
              </Link>
              {f && <CreditoFoto locale={locale} foto={f} className="modos-credito" />} {/* Crédito sobre la foto, fuera del enlace para no anidar enlaces */}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
