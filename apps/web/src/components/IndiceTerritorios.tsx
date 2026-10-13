// Índice de los 17 territorios: foto real redonda, nombre, tipo y estado real de su ficha.
// Solo los que tienen ficha publicada son enlaces; los demás dicen que están en verificación.
import Link from 'next/link'; // Enlace a la ficha
import { fotoDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { t } from '@/i18n/t'; // Textos traducidos

type Item = { slug: string; name: string }; // Territorio del índice

export function IndiceTerritorios({ locale, items, published }: { locale: string; items: Item[]; published: string[] }) {
  return (
    <ul className="indice m-0 list-none p-0">
      {items.map((ter) => {
        const f = fotoDe(ter.slug); // Foto del territorio (puede faltar)
        const pub = published.includes(ter.slug); // Si tiene ficha publicada
        const region = ter.slug.startsWith('costa-caribe'); // Las dos regiones autónomas
        const cuerpo = (
          <>
            {f ? <img src={f.imagen_movil} alt="" width={44} height={44} loading="lazy" decoding="async" className="indice-foto" /> : <span aria-hidden="true" className="indice-foto" />}
            {/* Foto redonda decorativa: el nombre ya dice qué territorio es */}
            <span className="min-w-0 flex-1">
              <span className="indice-nombre">{ter.name}</span> {/* Nombre del territorio */}
              <span className="indice-tipo">
                {t(locale, region ? 'index.region' : 'index.department')} {/* Departamento o región autónoma */}
                {' · '}
                <span data-estado={pub ? 'publicada' : 'pendiente'}>{t(locale, pub ? 'tmap.status_published' : 'tmap.status_pending')}</span> {/* Estado real de la ficha */}
              </span>
            </span>
            {pub && <span aria-hidden="true" className="indice-flecha">›</span>} {/* Indica que se abre */}
          </>
        );
        return (
          <li key={ter.slug}>
            {pub ? (
              <Link href={`/${locale}/territorios/${ter.slug}`} className="indice-fila" data-enlace="">{cuerpo}</Link> // Con ficha: se abre
            ) : (
              <div className="indice-fila">{cuerpo}</div> // Sin ficha todavía: solo informa
            )}
          </li>
        );
      })}
    </ul>
  );
}
