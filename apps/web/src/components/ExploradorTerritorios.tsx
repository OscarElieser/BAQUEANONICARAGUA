// Explorador a pantalla completa: la portada del territorio elegido llena el fondo, su nombre va en grande
// y las siguientes asoman a la derecha como tarjetas. Todo se dibuja en el servidor (los 17 a la vez);
// ControlExplorador solo cambia cuál está activo. Los datos son reales: nombre, zona y si tiene ficha.
import Link from 'next/link'; // Enlaces internos
import { PortadaTerritorio } from './PortadaTerritorio'; // Portada ilustrada (necesita <SpriteMapa />)
import { ControlExplorador } from './ControlExplorador'; // Cambio de territorio
import { territorios, ZONA_TEXTO } from '@/lib/portadas'; // Los 17 territorios y el nombre de cada zona
import { t } from '@/i18n/t'; // Textos traducidos

const dos = (n: number) => String(n).padStart(2, '0'); // 4 → "04"

export function ExploradorTerritorios({ locale, published }: { locale: string; published: string[] }) {
  const total = territorios.length; // 17
  return (
    <section id="explorador" data-activo="0" aria-roledescription="carrusel" aria-label={t(locale, 'explorer.label')} className="explorador">
      <h2 className="visually-hidden">{t(locale, 'explorer.title')}</h2> {/* Título para lectores de pantalla */}
      <div className="exp-fondos" aria-hidden="true">
        {territorios.map((ter, i) => (
          <div key={ter.slug} className={`exp-fondo${i === 0 ? ' es-activo' : ''}`} data-i={i}>
            <PortadaTerritorio slug={ter.slug} uid={`xf${i}`} className="h-full w-full" /> {/* Portada a pantalla completa */}
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
                <p className="exp-nota">{t(locale, 'explorer.note')}</p> {/* Aviso: es ilustración */}
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
                <PortadaTerritorio slug={ter.slug} uid={`xc${i}`} className="exp-carta-img" /> {/* Portada pequeña */}
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

      <ControlExplorador total={total} anterior={t(locale, 'gallery.prev')} siguiente={t(locale, 'gallery.next')} /> {/* Flechas y teclado */}
    </section>
  );
}
