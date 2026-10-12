// Tarjeta de un territorio: portada, nombre, zona y estado. Si tiene ficha publicada, es un enlace.
// Se dibuja en el servidor; la inclinación 3D la agrega <InclinacionTarjetas /> en el navegador.
import Link from 'next/link'; // Enlace interno
import { PortadaTerritorio } from './PortadaTerritorio'; // Portada ilustrada
import { ZONA_TEXTO, type Zona } from '@/lib/portadas'; // Nombre de cada zona
import { t } from '@/i18n/t'; // Textos traducidos

type Props = { locale: string; slug: string; name: string; zone: Zona; published: boolean; uid: string; interactive?: boolean }; // Datos de la tarjeta

export function TarjetaTerritorio({ locale, slug, name, zone, published, uid, interactive = true }: Props) {
  const cuerpo = (
    <>
      <span className="tarjeta-lamina">
        <PortadaTerritorio slug={slug} uid={uid} className="block aspect-[4/5] w-full" /> {/* Portada ilustrada */}
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
