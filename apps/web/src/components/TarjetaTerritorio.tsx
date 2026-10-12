// Tarjeta de un territorio: portada, nombre, zona y estado. Si tiene ficha publicada, es un enlace.
// Se dibuja en el servidor; la inclinación 3D la agrega <InclinacionTarjetas /> en el navegador.
import Link from 'next/link'; // Enlace interno
import { PortadaTerritorio } from './PortadaTerritorio'; // Portada ilustrada
import { ZONA_TEXTO, type Zona } from '@/lib/portadas'; // Nombre de cada zona
import { t } from '@/i18n/t'; // Textos traducidos
import { fotoDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { cajaDe, territorio } from '@/lib/portadas'; // Encuadre de la silueta

type Props = { locale: string; slug: string; name: string; zone: Zona; published: boolean; uid: string; interactive?: boolean }; // Datos de la tarjeta

export function TarjetaTerritorio({ locale, slug, name, zone, published, uid, interactive = true }: Props) {
  const cuerpo = (
    <>
      <span className="tarjeta-lamina">
        {fotoDe(slug) ? (
          <>
            <img src={fotoDe(slug)!.imagen_movil} alt="" width={800} height={1000} loading="lazy" decoding="async" title={t(locale, 'photo.credit', { author: fotoDe(slug)!.autor, license: fotoDe(slug)!.licencia })} className="block aspect-[4/5] h-auto w-full object-cover" /> {/* Foto real del territorio (crédito en el título y en la página de créditos) */}
            <Silueta slug={slug} /> {/* Silueta del territorio en la esquina */}
          </>
        ) : (
          <PortadaTerritorio slug={slug} uid={uid} className="block aspect-[4/5] w-full" /> // Sin foto: portada ilustrada
        )}
        <span className="tarjeta-brillo" aria-hidden="true" /> {/* Reflejo que sigue al cursor */}
      </span>
      <span className="mt-3 block font-display text-[22px] leading-tight">{name}</span> {/* Nombre */}
      <span className="mt-1 block text-[14px] text-ink-muted">{t(locale, ZONA_TEXTO[zone])}</span> {/* Zona de paisaje */}
      <span className={`block text-[14px] ${published ? 'text-status-verified' : 'text-oro-text'}`}>
        {t(locale, published ? 'tmap.status_published' : 'tmap.status_pending')} {/* Estado en texto, no solo color */}
      </span>
    </>
  ); // Contenido común

  const clase = interactive ? 'tarjeta-3d inclinable' : 'tarjeta-3d'; // Solo las interactivas se inclinan
  return published && interactive ? (
    <Link href={`/${locale}/territorios/${slug}`} className={`${clase} block text-ink no-underline`}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}

/** Silueta del territorio dibujada en una esquina de la foto, para ubicarlo en el país. */
function Silueta({ slug }: { slug: string }) {
  const ter = territorio(slug); // Territorio
  if (!ter) return null; // Desconocido
  const c = cajaDe(ter.d); // Rectángulo de la silueta
  const lado = Math.max(c.w, c.h) * 1.15; // Cuadro con margen
  return (
    <svg aria-hidden="true" focusable="false" viewBox={`${c.x + c.w / 2 - lado / 2} ${c.y + c.h / 2 - lado / 2} ${lado} ${lado}`} className="tarjeta-silueta">
      <use href={`#ter-${slug}`} /> {/* Forma real del territorio (de SpriteMapa) */}
    </svg>
  );
}
