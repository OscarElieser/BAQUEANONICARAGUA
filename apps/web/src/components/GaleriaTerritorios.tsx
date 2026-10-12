// Galería de las 17 portadas de territorio en arco 3D. Se dibuja en el servidor; solo las flechas son interactivas.
import { Galeria3D } from './Galeria3D'; // Galería en arco
import { TarjetaTerritorio } from './TarjetaTerritorio'; // Tarjeta de cada territorio
import { territorios } from '@/lib/portadas'; // Los 17 territorios
import { t } from '@/i18n/t'; // Textos traducidos

export function GaleriaTerritorios({ locale, published }: { locale: string; published: string[] }) {
  return (
    <Galeria3D
      id="territorios" // Une la galería con sus flechas
      titulo={t(locale, 'gallery.title')} // "Los 17, uno por uno"
      intro={t(locale, 'gallery.intro')} // Aclara que son ilustraciones, no fotos
      etiqueta={t(locale, 'gallery.arc_label')} // Nombre accesible e instrucciones
      anterior={t(locale, 'gallery.prev')} // Flecha izquierda
      siguiente={t(locale, 'gallery.next')} // Flecha derecha
      items={territorios.map((ter) => ({
        key: ter.slug, // Territorio
        contenido: <TarjetaTerritorio locale={locale} slug={ter.slug} name={ter.name} zone={ter.zone} published={published.includes(ter.slug)} uid="g" />, // Tarjeta real (enlace si tiene ficha)
      }))}
    />
  );
}
