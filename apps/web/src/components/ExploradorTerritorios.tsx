// Explorador a pantalla completa: la portada del territorio elegido llena el fondo, su nombre va en grande
// y las siguientes asoman a la derecha como tarjetas. Todo se dibuja en el servidor (los 17 a la vez);
// ControlExplorador solo cambia cuál está activo. Los datos son reales: nombre, zona y si tiene ficha.
import Link from 'next/link'; // Enlaces internos
import { PortadaTerritorio } from './PortadaTerritorio'; // Portada ilustrada (necesita <SpriteMapa />)
import { ControlExplorador } from './ControlExplorador'; // Cambio de territorio
import { territorios, ZONA_TEXTO } from '@/lib/portadas'; // Los 17 territorios y el nombre de cada zona
import { t } from '@/i18n/t'; // Textos traducidos
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { CreditoFoto } from './CreditoFoto'; // Crédito de cada foto

const dos = (n: number) => String(n).padStart(2, '0'); // 4 → "04"

export function ExploradorTerritorios({ locale, published }: { locale: string; published: string[] }) {
  const total = territorios.length; // 17
  return (
    <section id="explorador" data-activo="0" aria-roledescription="carrusel" aria-label={t(locale, 'explorer.label')} className="explorador">
      <h2 className="visually-hidden">{t(locale, 'explorer.title')}</h2> {/* Título para lectores de pantalla */}
      <div className="exp-fondos" aria-hidden="true">
        {territorios.map((ter, i) => (
          <div key={ter.slug} className={`exp-fondo${i === 0 ? ' es-activo' : ''}`} data-i={i}>
            {fotoDe(ter.slug) ? (
              <img
                alt="" // Decorativa: el nombre y el crédito van en texto
                {...(i === 0 ? { src: fotoDe(ter.slug)!.imagen, srcSet: srcsetDe(fotoDe(ter.slug)!) } : { 'data-src': fotoDe(ter.slug)!.imagen, 'data-srcset': srcsetDe(fotoDe(ter.slug)!) })} // Solo la primera se carga de entrada; las demás al acercarse
                sizes="100vw" // Ocupa todo el ancho
                decoding="async" // Sin bloquear la página
                className="exp-foto" // Llena el fondo
              />
            ) : (
              <PortadaTerritorio slug={ter.slug} uid={`xf${i}`} className="h-full w-full" /> // Sin foto: la portada ilustrada
            )}
          </div>
        ))}
      </div>
      <div className="exp-velo" aria-hidden="true" /> {/* Sombra a la izquierda: el texto siempre se lee */}

      <div className="exp-riel" aria-hidden="true"><span className="exp-riel-lleno" /></div> {/* Riel de avance vertical */}

      <div className="exp-cuerpo">
        <div className="exp-textos" aria-live="polite">
          {territorios.map((ter, i) => {
            const pub = published.includes(ter.slug); // Si tiene ficha publicada
            return (
              <div key={ter.slug} className="exp-slide" data-i={i} hidden={i !== 0}>
                <p className="exp-contador"><span>{dos(i + 1)}</span><span className="exp-linea" aria-hidden="true" /><span>{dos(total)}</span></p> {/* Posición: 01 — 17 */}
                <p className="exp-zona">{t(locale, ZONA_TEXTO[ter.zone])}</p> {/* Zona de paisaje */}
                <h3 className="exp-nombre">{ter.name}</h3> {/* Nombre en grande */}
                <p className={`exp-estado ${pub ? 'text-status-verified' : 'text-oro-text'}`}>{t(locale, pub ? 'tmap.status_published' : 'tmap.status_pending')}</p> {/* Estado real */}
                {fotoDe(ter.slug) ? (
                  <p className="exp-nota"><span className="font-bold text-ink">{fotoDe(ter.slug)!.lugar}.</span> <CreditoFoto locale={locale} foto={fotoDe(ter.slug)!} /></p> // Lugar real y crédito de la foto
                ) : (
                  <p className="exp-nota">{t(locale, 'tmap.note')}</p> // Sin foto: aviso de la ilustración
                )}
                {pub ? (
                  <Link href={`/${locale}/territorios/${ter.slug}`} className="exp-cta">{t(locale, 'explorer.open', { name: ter.name })}</Link> // Abre la ficha publicada
                ) : (
                  <a href="#territorios" className="exp-cta">{t(locale, 'explorer.map')}</a> // Sin ficha todavía: lleva al mapa
                )}
              </div>
            );
          })}
        </div>

        <ul className="exp-cartas">
          {territorios.map((ter, i) => (
            <li key={ter.slug} data-i={i} data-pos={i >= 1 && i <= 3 ? String(i) : undefined}>
              <button type="button" data-ir={i} className="exp-carta" aria-label={t(locale, 'explorer.see', { name: ter.name })}>
                {fotoDe(ter.slug) ? (
                  <img alt="" {...(i >= 1 && i <= 3 ? { src: fotoDe(ter.slug)!.imagen_movil } : { 'data-src': fotoDe(ter.slug)!.imagen_movil })} decoding="async" className="exp-carta-img object-cover" /> // Foto real pequeña (las ocultas se cargan al asomar)
                ) : (
                  <PortadaTerritorio slug={ter.slug} uid={`xc${i}`} className="exp-carta-img" /> // Sin foto: portada ilustrada
                )}
                <span className="exp-carta-num" aria-hidden="true">{dos(i + 1)}</span> {/* Número */}
                <span className="exp-carta-texto" aria-hidden="true">
                  <span className="block text-[12px] opacity-80">{t(locale, ZONA_TEXTO[ter.zone])}</span> {/* Zona */}
                  <span className="block text-[18px] font-bold leading-tight">{ter.name}</span> {/* Nombre */}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <ul className="exp-fila" aria-label={t(locale, 'index.title')}>
        {/* Los 17 en fila, con foto redonda: al tocar uno pasa a ser el territorio activo */}
        {territorios.map((ter, i) => (
          <li key={ter.slug}>
            <button type="button" data-ir={i} aria-current={i === 0 ? 'true' : undefined} className="exp-fila-boton">
              {fotoDe(ter.slug) ? <img src={fotoDe(ter.slug)!.imagen_movil} alt="" width={56} height={56} loading="lazy" decoding="async" /> : <span aria-hidden="true" className="exp-fila-vacio" />}
              {/* Foto decorativa: el nombre de abajo dice qué territorio es */}
              <span>{ter.name}</span> {/* Nombre del territorio */}
            </button>
          </li>
        ))}
      </ul>

      <ControlExplorador total={total} anterior={t(locale, 'gallery.prev')} siguiente={t(locale, 'gallery.next')} /> {/* Flechas y teclado */}
    </section>
  );
}
