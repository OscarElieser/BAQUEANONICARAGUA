import { CreditoFoto } from '@/components/CreditoFoto'; // Crédito de la foto
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { Planificador } from '@/components/Planificador'; // Intérprete del viaje
import { t } from '@/i18n/t'; // Textos traducidos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { pageMetadata } from '@/lib/seo'; // Canónica, idiomas y vista previa
import { letraAventura } from '@/app/fuentes'; // Letra propia de Mi aventura (Anybody, ancho variable)
import { RutaPintada } from '@/components/RutaPintada'; // Ruta que se dibuja

/** Metadatos para buscadores en el idioma de la página. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return pageMetadata(locale, '/mi-aventura', t(locale, 'adventure.title'), t(locale, 'adventure.intro')); // Canónica y versiones por idioma
}

export default async function MiAventura({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const foto = fotoDe('rivas'); // Foto real del encabezado (bahía de San Juan del Sur)
  return (
    <main className={`${letraAventura.variable} mundo-aventura pb-16`}>
      {/* Mundo de Mi aventura: los buses pintados de Nicaragua */}
      <header className="aventura-heroe aventura-con-foto">
        {foto && <img src={foto.imagen_movil} srcSet={srcsetDe(foto)} sizes="100vw" alt="" decoding="async" className="aventura-foto" />} {/* Foto real de fondo (decorativa; el crédito va abajo) */}
        <div className="relative mx-auto flex max-w-[1280px] flex-wrap items-end gap-10 px-4 pb-6 pt-14 sm:px-12">
          <h1 className="rotulo m-0 flex-[1_1_460px] font-mundo text-[46px] leading-[0.95] sm:text-[84px]">
            {t(locale, 'adventure.title')} {/* Rótulo que se estira al llegar */}
          </h1>
          <p className="m-0 max-w-[46ch] flex-[1_1_340px] text-[19px] leading-[30px]">
            {t(locale, 'adventure.intro')} {/* Presentación */}
          </p>
        </div>
        {foto && <div className="relative mx-auto max-w-[1280px] px-4 sm:px-12"><CreditoFoto locale={locale} foto={foto} /></div>} {/* Crédito de la foto */}
        <RutaPintada className="block h-[90px] w-full" /> {/* Ruta con paradas */}
        <div className="franjas-bus" aria-hidden="true" /> {/* Franjas del costado del bus */}
      </header>
      <div className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-12">
      <Planificador locale={locale} /> {/* Intérprete del viaje */}
      </div>
    </main>
  );
}
